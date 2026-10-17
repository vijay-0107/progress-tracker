/**
 * The ₹0 practice lab: free tools that replace paid cloud for the Cloud &
 * DevOps and Cloud Security lessons, plus safety rules for the optional
 * real-cloud steps. Facts checked on the date below; free offers change, so
 * every entry links to its official page.
 */
export const freeLabCheckedOn = "2026-10-17";

export interface FreeLabTool {
  name: string;
  replaces: string;
  cost: string;
  url: string;
  setup: string[];
  limits: string;
}

export interface FreeLabGroup {
  title: string;
  summary: string;
  tools: FreeLabTool[];
}

export const freeLabGroups: FreeLabGroup[] = [
  {
    title: "AWS on your laptop",
    summary:
      "Emulators answer the same API calls as AWS, so the AWS CLI, SDKs and Terraform work unchanged once you point them at localhost.",
    tools: [
      {
        name: "Floci",
        replaces:
          "S3, Lambda, DynamoDB, SQS, IAM, STS, KMS, API Gateway and more",
        cost: "Free, MIT licence, no account or token",
        url: "https://floci.io/",
        setup: [
          "docker run -p 4566:4566 floci/floci",
          "export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1",
          "aws --endpoint-url http://localhost:4566 s3 mb s3://my-lab-bucket",
        ],
        limits:
          "A newer project: if a command misbehaves, try the same step on LocalStack or Moto.",
      },
      {
        name: "LocalStack",
        replaces: "The most widely used AWS emulator",
        cost: "Free tier for non-commercial use; needs a free account and auth token since March 2026",
        url: "https://www.localstack.cloud/",
        setup: [
          "Create a free account and copy your auth token",
          "docker run -e LOCALSTACK_AUTH_TOKEN=<your-token> -p 4566:4566 localstack/localstack",
          "pip install awscli-local terraform-local  # gives `awslocal` and `tflocal`",
        ],
        limits:
          "Personal learning is non-commercial; do not use the free tier for paid client work.",
      },
      {
        name: "Moto (server mode)",
        replaces: "Many AWS APIs, popular for tests",
        cost: "Free, open source",
        url: "https://docs.getmoto.org/en/latest/docs/server_mode.html",
        setup: [
          'pip install "moto[server]"',
          "moto_server -p 5000",
          "aws --endpoint-url http://localhost:5000 s3 ls",
        ],
        limits:
          "Great for scripts and tests; less complete for Lambda execution.",
      },
    ],
  },
  {
    title: "Kubernetes and DevOps",
    summary:
      "Everything in the Kubernetes, Helm, GitOps, autoscaling and observability lessons runs for real on a local cluster.",
    tools: [
      {
        name: "kind",
        replaces: "EKS / AKS for learning",
        cost: "Free, open source",
        url: "https://kind.sigs.k8s.io/docs/user/quick-start/",
        setup: [
          "kind create cluster --name lab",
          "kubectl get nodes",
          "kind delete cluster --name lab  # when finished",
        ],
        limits:
          "Give Docker at least 4 GB RAM. Real cloud load balancers and node autoscaling (Karpenter) need real cloud.",
      },
      {
        name: "minikube or k3d",
        replaces: "Alternatives to kind",
        cost: "Free, open source",
        url: "https://k3d.io/",
        setup: ["k3d cluster create lab  # lighter on low-RAM laptops"],
        limits: "Pick one; the lessons work on any of them.",
      },
      {
        name: "Killercoda and Play with Kubernetes",
        replaces: "A Kubernetes or Linux machine in the browser",
        cost: "Free",
        url: "https://killercoda.com/",
        setup: [
          "Open a Kubernetes or Ubuntu playground and keep your YAML in Git",
        ],
        limits:
          "Sessions reset when they end. Good for CKA-style practice and slow laptops.",
      },
      {
        name: "GitHub Actions + ghcr.io",
        replaces: "Paid CI/CD and container registries",
        cost: "Standard runners are free for public repositories; public images on ghcr.io are free",
        url: "https://docs.github.com/en/actions",
        setup: [
          "Keep lab repositories public with no secrets in them",
          "Use helm/kind-action to start a kind cluster inside a workflow",
        ],
        limits:
          "Private repositories have a monthly free-minutes allowance; check the usage page.",
      },
      {
        name: "Terraform or OpenTofu",
        replaces: "Infrastructure as code against the emulator or Docker",
        cost: "Free",
        url: "https://developer.hashicorp.com/terraform/tutorials/aws-get-started",
        setup: [
          'provider "aws" {',
          '  region = "us-east-1"',
          '  access_key = "test"',
          '  secret_key = "test"',
          "  skip_credentials_validation = true",
          "  skip_requesting_account_id = true",
          "  s3_use_path_style = true",
          "  endpoints {",
          '    s3     = "http://localhost:4566"',
          '    lambda = "http://localhost:4566"',
          '    iam    = "http://localhost:4566"',
          "  }",
          "}",
        ],
        limits:
          "Add an endpoint line for each service you use. Plans and state behave exactly as with real AWS.",
      },
    ],
  },
  {
    title: "Security, identity and monitoring",
    summary:
      "Free tools that do the same jobs as Entra ID, Key Vault, Sentinel and Defender, so you learn the skill even without an Azure subscription.",
    tools: [
      {
        name: "Keycloak",
        replaces: "Entra ID / Okta for SSO, OIDC, SAML and MFA practice",
        cost: "Free, open source",
        url: "https://www.keycloak.org/getting-started/getting-started-docker",
        setup: [
          "docker run -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak start-dev",
        ],
        limits: "Dev mode only; never expose it to the internet.",
      },
      {
        name: "HashiCorp Vault (dev mode)",
        replaces: "Azure Key Vault / AWS Secrets Manager patterns",
        cost: "Free to run locally",
        url: "https://developer.hashicorp.com/vault/docs/concepts/dev-server",
        setup: ["vault server -dev"],
        limits: "Dev mode keeps data in memory and is unsealed; lab use only.",
      },
      {
        name: "Wazuh or Elastic Stack",
        replaces: "Microsoft Sentinel and other paid SIEMs",
        cost: "Free, open source",
        url: "https://documentation.wazuh.com/current/deployment-options/docker/index.html",
        setup: ["Use the single-node Docker deployment from the Wazuh docs"],
        limits: "Needs about 4-8 GB of RAM.",
      },
      {
        name: "Prometheus, Grafana, Loki, Jaeger",
        replaces: "CloudWatch and paid monitoring",
        cost: "Free, open source",
        url: "https://prometheus.io/docs/introduction/overview/",
        setup: [
          "helm install monitoring prometheus-community/kube-prometheus-stack",
        ],
        limits: "Run only Prometheus + Grafana on a low-RAM laptop.",
      },
      {
        name: "Scanners: Trivy, Checkov, Semgrep, Prowler",
        replaces: "Paid posture and code scanning",
        cost: "Free, open source",
        url: "https://trivy.dev/",
        setup: ["Run them locally and in GitHub Actions"],
        limits:
          "Prowler is best run later against a real Free plan account; many of its checks need real AWS.",
      },
    ],
  },
  {
    title: "GPUs for AI infrastructure",
    summary:
      "There is no free GPU cluster, but free notebooks give you a real GPU for serving and benchmarking.",
    tools: [
      {
        name: "Kaggle Notebooks",
        replaces: "Paid GPU instances for small experiments",
        cost: "Free weekly GPU quota (shown in your Kaggle settings), sessions up to 12 hours",
        url: "https://www.kaggle.com/docs/notebooks",
        setup: ["Settings → Accelerator → GPU", "!nvidia-smi"],
        limits: "Quotas and GPU types change; always record the GPU you used.",
      },
      {
        name: "Google Colab (free tier)",
        replaces: "Paid GPU instances for small experiments",
        cost: "Free; no published quota, sessions up to about 12 hours",
        url: "https://colab.research.google.com/",
        setup: ["Runtime → Change runtime type → GPU"],
        limits: "GPU availability varies; idle sessions are stopped.",
      },
      {
        name: "Ollama or llama.cpp",
        replaces: "GPU serving on a laptop without a GPU",
        cost: "Free, open source",
        url: "https://ollama.com/",
        setup: ["Run a small quantised model on CPU for load-testing practice"],
        limits: "Slow; label every number as CPU.",
      },
    ],
  },
];

export interface RealCloudOption {
  name: string;
  url: string;
  facts: string[];
  rules: string[];
}

/** Optional real-cloud steps: only plans that cannot charge you unless you upgrade. */
export const realCloudOptions: RealCloudOption[] = [
  {
    name: "AWS Free plan",
    url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier.html",
    facts: [
      "Up to $200 in credits ($100 at sign-up, up to $100 more for trying services) for 6 months.",
      "AWS says you will not incur charges during this period until you upgrade to a paid account plan.",
      "The plan ends after 6 months or when the credits are used up; some costly services are not available on it.",
    ],
    rules: [
      "Choose the Free plan at sign-up and never click 'Upgrade to paid plan'.",
      "Enable MFA on the root user and set a $1 budget alert anyway.",
      "Do each real-cloud step in one sitting, then delete everything (`terraform destroy`) and check the console.",
      "Skip EKS, NAT gateways and GPU instances; they use up credits quickly. The course marks these as plan-only.",
    ],
  },
  {
    name: "Azure free account",
    url: "https://azure.microsoft.com/free/free-account-faq",
    facts: [
      "$200 credit for 30 days plus free monthly amounts of some services.",
      "Microsoft says you won't be charged unless you decide to move to pay-as-you-go; a card is needed for identity checks.",
      "The free Microsoft Learn sandboxes have been discontinued.",
    ],
    rules: [
      "Never move to pay-as-you-go during the lab period.",
      "Put each lab in its own resource group and delete the group when finished.",
      "Ask your employer first: a Visual Studio subscription includes monthly Azure credit with a spending limit. Leave that limit on.",
    ],
  },
];
