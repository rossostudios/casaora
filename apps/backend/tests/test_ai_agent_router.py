import unittest
from unittest.mock import patch

from app.api.routers.ai_agent import ai_agent_chat, get_agent_capabilities
from app.schemas.domain import AgentChatInput, AgentConversationMessageInput


class AiAgentRouterTest(unittest.TestCase):
    @patch("app.api.routers.ai_agent.assert_org_member")
    def test_capabilities_uses_membership_role(self, mock_assert_org_member):
        mock_assert_org_member.return_value = {
            "organization_id": "org-1",
            "user_id": "user-1",
            "role": "owner_admin",
        }

        result = get_agent_capabilities(org_id="org-1", user_id="user-1")

        self.assertEqual(result["organization_id"], "org-1")
        self.assertEqual(result["role"], "owner_admin")
        self.assertIs(result["mutations_enabled"], False)
        self.assertIn("tasks", result["tables"])

    @patch("app.api.routers.ai_agent.write_audit_log")
    @patch("app.api.routers.ai_agent.run_ai_agent_chat")
    @patch("app.api.routers.ai_agent.assert_org_member")
    def test_chat_calls_service_and_writes_audit(
        self,
        mock_assert_org_member,
        mock_run_ai_agent_chat,
        mock_write_audit_log,
    ):
        mock_assert_org_member.return_value = {
            "organization_id": "org-1",
            "user_id": "user-1",
            "role": "operator",
        }
        mock_run_ai_agent_chat.return_value = {
            "reply": "Done",
            "tool_trace": [{"tool": "list_rows", "ok": True}],
            "mutations_enabled": True,
        }

        payload = AgentChatInput(
            org_id="org-1",
            message="Show me overdue tasks",
            allow_mutations=True,
            conversation=[
                AgentConversationMessageInput(
                    role="assistant",
                    content="How can I help?",
                )
            ],
        )

        result = ai_agent_chat(payload, user_id="user-1")

        self.assertEqual(result["organization_id"], "org-1")
        self.assertEqual(result["role"], "operator")
        self.assertEqual(result["reply"], "Done")
        self.assertEqual(len(result["tool_trace"]), 1)

        mock_run_ai_agent_chat.assert_called_once()
        _args, kwargs = mock_run_ai_agent_chat.call_args
        self.assertEqual(kwargs["org_id"], "org-1")
        self.assertEqual(kwargs["user_id"], "user-1")
        self.assertEqual(kwargs["role"], "operator")
        self.assertEqual(kwargs["message"], "Show me overdue tasks")
        self.assertEqual(kwargs["allow_mutations"], True)
        self.assertEqual(
            kwargs["conversation"],
            [{"role": "assistant", "content": "How can I help?"}],
        )

        mock_write_audit_log.assert_called_once()


if __name__ == "__main__":
    unittest.main()
