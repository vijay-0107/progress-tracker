from __future__ import annotations

import hashlib
import importlib.util
import json
import re
from collections import OrderedDict
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parent
RESUME_DIR = ROOT.parent
OUTPUT_FILE = ROOT / "schedule-data.json"

FOCUS_SUFFIX = re.compile(r"^(?P<title>.+) \((Learn|Implement|Practice|Deep Practice|Mastery Check) \d+/\d+\)$")


def load_module(module_name: str, file_path: Path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {file_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def slug(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "item"


def stable_id(prefix: str, *parts: str) -> str:
    joined = "|".join(str(part) for part in parts)
    digest = hashlib.md5(joined.encode("utf-8")).hexdigest()[:8]
    readable = slug(parts[-1])[:54] if parts else "item"
    return f"{prefix}-{readable}-{digest}"


def iso_date(value) -> str:
    if isinstance(value, datetime):
        value = value.date()
    if isinstance(value, date):
        return value.isoformat()
    return value.isoformat()


def google_link(label: str, query: str, link_type: str) -> dict:
    return {
        "label": label,
        "url": f"https://www.google.com/search?q={quote_plus(query)}",
        "type": link_type,
    }


def dedupe_links(links: list[dict]) -> list[dict]:
    seen = set()
    output = []
    for link in links:
        url = link.get("url")
        if not url or url in seen:
            continue
        seen.add(url)
        output.append(link)
    return output


def study_base_title(concept_name: str, title: str) -> str:
    match = FOCUS_SUFFIX.match(title)
    if match:
        return match.group("title")
    capstone_marker = f"{concept_name} Capstone - "
    if title.startswith(capstone_marker):
        return "Capstone Review"
    return title


def build_study_links(base_title: str, entry: dict) -> list[dict]:
    links = []
    if entry.get("link"):
        label = entry.get("video") or "Reference video"
        channel = entry.get("channel")
        if channel:
            label = f"{label} - {channel}"
        links.append({"label": label, "url": entry["link"], "type": "Resource"})

    links.extend([
        google_link("Practice problems", f"{base_title} practice problems", "Practice"),
        google_link("Quiz or assessment", f"{base_title} quiz assessment", "Test"),
        google_link("Project examples", f"{base_title} project example", "Build"),
    ])
    return dedupe_links(links)


def build_study_topics(study_module) -> list[dict]:
    curriculum = study_module.expand_curriculum_to_one_hour(study_module.get_curriculum())
    current_date = study_module.START_DATE
    topics = []

    for concept_name, concept in curriculum.items():
        dates = study_module.get_study_dates(current_date, concept["total_days"])
        topic_id = stable_id("study", concept.get("phase_name", "Study"), concept_name)
        subtopics: OrderedDict[str, dict] = OrderedDict()

        for index, entry in enumerate(concept["topics"], start=1):
            session_date = dates[index - 1]
            base_title = study_base_title(concept_name, entry["topic"])
            subtopic_id = stable_id("sub", topic_id, base_title)
            if subtopic_id not in subtopics:
                subtopics[subtopic_id] = {
                    "id": subtopic_id,
                    "title": base_title,
                    "subtitle": concept.get("phase_name", "Study Plan"),
                    "description": concept.get("description", ""),
                    "sessions": [],
                }

            day_id = stable_id("day", topic_id, subtopic_id, str(index), entry["topic"])
            subtopics[subtopic_id]["sessions"].append({
                "id": day_id,
                "dayNumber": index,
                "date": iso_date(session_date),
                "title": entry["topic"],
                "focus": entry.get("focus", "Study"),
                "brief": entry.get("action_plan", concept.get("description", "")),
                "description": concept.get("description", ""),
                "resource": f"{entry.get('video', 'Reference')} - {entry.get('channel', 'Reference')}",
                "actionPlan": entry.get("action_plan", ""),
                "practiceTarget": entry.get("practice_task", ""),
                "successMetric": entry.get("mastery_check", ""),
                "optionalStretch": "Add 15 minutes for notes cleanup, extra problems, or revision if energy allows.",
                "links": build_study_links(base_title, entry),
            })

        topics.append({
            "id": topic_id,
            "title": concept_name,
            "schedule": "Career Study Plan",
            "source": "generate_study_plan.py",
            "category": concept.get("phase_name", "Study Plan"),
            "description": concept.get("description", ""),
            "accent": f"#{concept.get('color', 'D6E4F0')}",
            "startDate": iso_date(dates[0]),
            "endDate": iso_date(dates[-1]),
            "subtopics": list(subtopics.values()),
        })
        current_date = dates[-1] + timedelta(days=1)

    return topics


def cat_section_title(section: str) -> str:
    return {
        "QA": "CAT 2026 - Quantitative Aptitude",
        "VARC": "CAT 2026 - VARC",
        "DILR": "CAT 2026 - DILR",
        "Mock/Analysis": "CAT 2026 - Mocks and Analysis",
    }.get(section, f"CAT 2026 - {section}")


def build_cat_links(cat_module, section: str, topic: str) -> list[dict]:
    resource_section = "Mock" if section == "Mock/Analysis" else section
    links = []
    for row in cat_module.RESOURCES:
        if row[0] == resource_section and row[5]:
            links.append({"label": row[1], "url": row[5], "type": row[2]})

    links.extend([
        google_link("Topic practice", f"CAT {section} {topic} practice questions", "Practice"),
        google_link("Sectional test", f"CAT {section} sectional test {topic}", "Test"),
        google_link("Previous year questions", f"CAT previous year {section} {topic}", "PYQ"),
    ])
    return dedupe_links(links)


def build_cat_topics(cat_module) -> list[dict]:
    topic_index = {
        phase_name: {section: 0 for section in cat_module.SECTION_BY_WEEKDAY.values()}
        for phase_name in cat_module.TOPICS
    }
    by_section: OrderedDict[str, dict] = OrderedDict()

    for day_number, current_day in enumerate(cat_module.iter_days(cat_module.START_DATE, cat_module.END_DATE), start=1):
        phase = cat_module.get_phase(current_day)
        phase_name = phase["name"]
        section = cat_module.SECTION_BY_WEEKDAY[current_day.weekday()]
        topic_pool = cat_module.TOPICS[phase_name][section]
        pool_index = topic_index[phase_name][section]
        topic, subtopics, practice_target = topic_pool[pool_index % len(topic_pool)]
        topic_index[phase_name][section] += 1

        top_id = stable_id("cat", section, cat_section_title(section))
        if top_id not in by_section:
            by_section[top_id] = {
                "id": top_id,
                "title": cat_section_title(section),
                "schedule": "CAT 2026 Prep",
                "source": "generate_cat_2026_plan.py",
                "category": section,
                "description": "One-hour daily CAT preparation blocks grouped by section and topic.",
                "accent": f"#{phase['color']}",
                "startDate": iso_date(current_day),
                "endDate": iso_date(current_day),
                "subtopics": OrderedDict(),
            }

        section_topic = by_section[top_id]
        section_topic["endDate"] = iso_date(current_day)
        subtopic_id = stable_id("sub", top_id, phase_name, topic)
        if subtopic_id not in section_topic["subtopics"]:
            section_topic["subtopics"][subtopic_id] = {
                "id": subtopic_id,
                "title": topic,
                "subtitle": phase_name,
                "description": subtopics,
                "sessions": [],
            }

        day_id = stable_id("day", top_id, subtopic_id, str(day_number), iso_date(current_day))
        week_number = ((current_day - cat_module.START_DATE).days // 7) + 1
        section_topic["subtopics"][subtopic_id]["sessions"].append({
            "id": day_id,
            "dayNumber": day_number,
            "date": iso_date(current_day),
            "title": topic,
            "focus": section,
            "brief": subtopics,
            "description": f"Week {week_number}. {phase.get('goal', '')}",
            "resource": cat_module.RESOURCE_BY_SECTION[section],
            "actionPlan": cat_module.minute_plan(section, phase_name),
            "practiceTarget": practice_target,
            "successMetric": cat_module.success_metric(section, phase_name),
            "optionalStretch": cat_module.optional_stretch(section, phase_name),
            "links": build_cat_links(cat_module, section, topic),
        })

    topics = []
    for section_topic in by_section.values():
        section_topic["subtopics"] = list(section_topic["subtopics"].values())
        topics.append(section_topic)
    return topics


def main() -> None:
    study_module = load_module("generate_study_plan", RESUME_DIR / "generate_study_plan.py")
    cat_module = load_module("generate_cat_2026_plan", RESUME_DIR / "generate_cat_2026_plan.py")

    topics = build_study_topics(study_module) + build_cat_topics(cat_module)
    total_sessions = sum(len(subtopic["sessions"]) for topic in topics for subtopic in topic["subtopics"])
    payload = {
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "sources": ["generate_study_plan.py", "generate_cat_2026_plan.py"],
        "totalTopics": len(topics),
        "totalSessions": total_sessions,
        "topics": topics,
    }

    OUTPUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE}")
    print(f"Topics: {len(topics)}")
    print(f"Sessions: {total_sessions}")


if __name__ == "__main__":
    main()
