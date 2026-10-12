import logging
import os

import click
import uvicorn
from a2a.server.apps import A2AFastAPIApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import AgentCapabilities, AgentCard, AgentSkill
from dotenv import find_dotenv, load_dotenv

from agent import SuccessStoriesAgent
from agent_executor import SuccessStoriesAgentExecutor

load_dotenv(find_dotenv())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@click.command()
@click.option("--host", default="0.0.0.0")
@click.option("--port", default=int(os.getenv("PORT", 10010)), type=int)
def main(host, port):
    """Start the SAP Success Stories A2A Agent server."""
    skill = AgentSkill(
        id="success-stories-finder",
        name="SAP Success Stories Finder",
        description="Finds relevant SAP customer success stories based on a described use case using semantic similarity search.",
        tags=["SAP", "success stories", "discovery center", "BTP", "use case", "customer"],
        examples=[
            "We want to automate invoice processing",
            "Our company needs a better way to manage supplier relationships",
            "We are looking for examples of SAP BTP integration with legacy systems",
            "Show me stories about digital transformation in manufacturing",
            "What companies used SAP to improve their supply chain visibility?",
        ],
    )

    agent_card = AgentCard(
        name="SAP Success Stories Agent",
        description="Finds the most relevant SAP customer success stories for a given use case using vector similarity search over the Discovery Center catalogue.",
        url=f"http://{host}:{port}/",
        version="1.0.0",
        defaultInputModes=SuccessStoriesAgent.SUPPORTED_CONTENT_TYPES,
        defaultOutputModes=SuccessStoriesAgent.SUPPORTED_CONTENT_TYPES,
        capabilities=AgentCapabilities(streaming=True, pushNotifications=False),
        skills=[skill],
    )

    request_handler = DefaultRequestHandler(
        agent_executor=SuccessStoriesAgentExecutor(),
        task_store=InMemoryTaskStore(),
    )

    server = A2AFastAPIApplication(agent_card=agent_card, http_handler=request_handler)
    app = server.build()

    @app.get("/health")
    def health():
        return {"status": "ok"}

    logger.info("Agent running at http://%s:%s/", host, port)
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
