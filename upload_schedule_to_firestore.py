import argparse
import json
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ModuleNotFoundError:
    firebase_admin = None
    credentials = None
    firestore = None


BATCH_LIMIT = 400


def parse_args():
    parser = argparse.ArgumentParser(description="Upload schedule-data.json into a normalized Firestore catalog.")
    parser.add_argument("--schedule", default="schedule-data.json", help="Path to schedule-data.json")
    parser.add_argument("--catalog-id", default="current", help="Catalog document id under studyProgressCatalog")
    parser.add_argument("--service-account", help="Path to a Firebase service account JSON file")
    parser.add_argument("--project-id", help="Firebase project id, if not inferred from credentials")
    parser.add_argument("--dry-run", action="store_true", help="Print write counts without uploading")
    return parser.parse_args()


def init_firestore(service_account, project_id):
    if firebase_admin is None:
        raise SystemExit("Install firebase-admin first: python -m pip install firebase-admin")

    options = {"projectId": project_id} if project_id else None
    if service_account:
        credential = credentials.Certificate(service_account)
        firebase_admin.initialize_app(credential, options)
    elif options:
        firebase_admin.initialize_app(options=options)
    else:
        firebase_admin.initialize_app()
    return firestore.client()


def without_keys(data, *keys):
    return {key: value for key, value in data.items() if key not in keys}


def commit_when_full(batch, operations):
    if operations and operations % BATCH_LIMIT == 0:
        batch.commit()
        return True
    return False


def delete_collection(db, collection_ref):
    deleted = 0
    while True:
        documents = list(collection_ref.limit(BATCH_LIMIT).stream())
        if not documents:
            return deleted
        batch = db.batch()
        for document in documents:
            batch.delete(document.reference)
        batch.commit()
        deleted += len(documents)


def upload_catalog(db, catalog_id, schedule_data, dry_run=False):
    topic_docs = []
    subtopic_docs = []
    session_docs = []
    session_order = 0
    subtopic_order = 0

    for topic_order, topic in enumerate(schedule_data.get("topics", [])):
        topic_docs.append((topic["id"], {**without_keys(topic, "subtopics"), "order": topic_order}))
        for subtopic in topic.get("subtopics", []):
            subtopic_docs.append((subtopic["id"], {
                **without_keys(subtopic, "sessions"),
                "topicId": topic["id"],
                "order": subtopic_order,
            }))
            subtopic_order += 1
            for session in subtopic.get("sessions", []):
                session_docs.append((session["id"], {
                    **session,
                    "topicId": topic["id"],
                    "subtopicId": subtopic["id"],
                    "order": session_order,
                }))
                session_order += 1

    print(f"Catalog: studyProgressCatalog/{catalog_id}")
    print(f"Topics: {len(topic_docs)}")
    print(f"Subtopics: {len(subtopic_docs)}")
    print(f"Sessions: {len(session_docs)}")
    if dry_run:
        return

    catalog_ref = db.collection("studyProgressCatalog").document(catalog_id)
    topics_ref = catalog_ref.collection("topics")
    subtopics_ref = catalog_ref.collection("subtopics")
    sessions_ref = catalog_ref.collection("sessions")

    for collection_ref in (topics_ref, subtopics_ref, sessions_ref):
        deleted = delete_collection(db, collection_ref)
        if deleted:
            print(f"Deleted {deleted} existing docs from {collection_ref.id}")

    catalog_ref.set({
        "generatedAt": schedule_data.get("generatedAt"),
        "sources": schedule_data.get("sources", []),
        "totalTopics": schedule_data.get("totalTopics", len(topic_docs)),
        "totalSessions": schedule_data.get("totalSessions", len(session_docs)),
        "uploadedAt": firestore.SERVER_TIMESTAMP,
    })

    write_documents(db, topics_ref, topic_docs)
    write_documents(db, subtopics_ref, subtopic_docs)
    write_documents(db, sessions_ref, session_docs)
    print("Firestore catalog upload complete.")


def write_documents(db, collection_ref, documents):
    batch = db.batch()
    operations = 0
    for document_id, payload in documents:
        batch.set(collection_ref.document(document_id), payload)
        operations += 1
        if commit_when_full(batch, operations):
            batch = db.batch()
    if operations % BATCH_LIMIT:
        batch.commit()


def main():
    args = parse_args()
    schedule_path = Path(args.schedule)
    with schedule_path.open("r", encoding="utf-8") as schedule_file:
        schedule_data = json.load(schedule_file)

    if args.dry_run:
        upload_catalog(None, args.catalog_id, schedule_data, dry_run=True)
        return

    db = init_firestore(args.service_account, args.project_id)
    upload_catalog(db, args.catalog_id, schedule_data)


if __name__ == "__main__":
    main()
