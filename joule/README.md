# Success Stories Agent — Joule Deployment

This folder contains the Joule A2A capability definition for the **Success Stories Agent**, an agent that finds relevant SAP customer success stories from the Discovery Center. It integrates with Joule via the SAP DAS A2A protocol, routing requests to the Success Stories Agent through the BTP destination `SuccessStoriesAgent`.

## Prerequisites

- Joule CLI installed
- SAP BTP destination `SuccessStoriesAgent` configured pointing to the Success Stories Agent A2A URL
- Success Stories Agent A2A agent running (see `../agent/README.md`)

## Folder Structure

```
joule/
├── .env.example              # Environment variables template for Joule CLI auth
├── da.sapdas.yaml            # Digital Assistant definition referencing the a2a/ capability
└── a2a/
    ├── capability.sapdas.yaml        # Capability metadata (name, description, system alias)
    ├── capability_context.yaml       # Persistent context variables across turns
    ├── functions/
    │   └── success_stories_function.yaml  # Function handler — calls the remote A2A agent
    ├── scenarios/
    │   └── success_stories_scenario.yaml  # Trigger phrases and response wiring
    └── i18n/
        └── messages.properties       # Localisation strings
```

## 1. Configure Environment

Copy the environment file and fill in your Joule CLI credentials:

```bash
cp .env.example .env
```

Set the following values in `.env`:

| Variable | Description |
|---|---|
| `JOULE_AUTH_URL` | OAuth token endpoint URL |
| `JOULE_CLIENT_ID` | OAuth client ID |
| `JOULE_CLIENT_SECRET` | OAuth client secret |
| `JOULE_DEFAULT_IDP` | Set to `false` to use a custom Identity Provider |

## 2. Configure BTP Destination

Create a BTP destination named `SuccessStoriesAgent`

## 3. Login to Joule CLI

Login using the custom IDP (do **not** select "Default Identity Provider"):

```bash
joule login --use-env .env --sso-passcode
```

## 4. Compile & Deploy Capability

Compile the design-time artifact from the `a2a/` directory:

```bash
cd a2a && joule compile
```

Deploy the assistant (run from `joule/`):

```bash
cd .. && joule deploy da.sapdas.yaml
```

> Use `-n <your-assistant-name>` to override the assistant name.

## 5. Open Joule

```bash
joule launch successstoriesagent
```

You can now trigger the Success Stories Agent by sending a message such as:

> "Find SAP success stories about invoice automation"
> "Which companies use SAP for supply chain optimization?"
> "Show me customer references for SAP BTP"
