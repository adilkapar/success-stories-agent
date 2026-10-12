import logging

from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.tasks import TaskUpdater
from a2a.types import InternalError, TaskState, UnsupportedOperationError
from a2a.utils import new_agent_text_message, new_task
from a2a.utils.errors import ServerError

from agent import SuccessStoriesAgent

logger = logging.getLogger(__name__)


class SuccessStoriesAgentExecutor(AgentExecutor):

    def __init__(self):
        self.agent = SuccessStoriesAgent()

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        query = context.get_user_input()
        task = context.current_task
        if not task:
            task = new_task(context.message)
            await event_queue.enqueue_event(task)

        updater = TaskUpdater(event_queue, task.id, task.context_id)
        try:
            result = await self.agent.ainvoke(query, task.context_id)
            content = result.get("content", "")
            await updater.update_status(
                TaskState.completed,
                new_agent_text_message(content, task.context_id, task.id),
                final=True,
            )

        except Exception as e:
            logger.exception("Error while executing agent")
            raise ServerError(error=InternalError()) from e

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        raise ServerError(error=UnsupportedOperationError())
