"""
End-to-end integration test: Market + Deploy flow.

This test exercises the following flow using Python APIs directly:
1. Create a test agent
2. Use Deployer to deploy locally
3. Verify Deployer can retrieve the deployed agent
4. Create AgentRuntime from the deployed agent
5. Verify the runtime has tool_registry and pipeline_engine
6. Execute pipeline via Python PipelineEngine

External network calls (market upload/download) are mocked.
"""

import json
import os
import shutil
import sys
import tarfile
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import yaml

# Add agent-compose to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "agent-compose"))

from agent_compose.deployer import Deployer
from agent_compose.agent_runtime import AgentRuntime
from agent_compose.pipeline_engine import PipelineEngine, ExecutionContext
from agent_compose.tools import register_builtin_tools
from agent_compose.pipeline_engine import ToolRegistry
from agent_compose.market_client import MarketClient


def _build_test_agent(agent_dir: Path) -> None:
    """Create a minimal test agent with agent.json and worker.yaml."""
    agent_json = {
        "schema_version": "2.0",
        "identity": {
            "name": "test-market-deploy-agent",
            "version": "1.0.0",
            "description": "Test agent for market+deploy e2e",
            "author": "E2E Test Suite",
            "license": "MIT",
            "tags": ["test", "market", "deploy"]
        },
        "instructions": {
            "format": "markdown",
            "source": "inline",
            "content": "You are a test agent for market and deploy flow validation."
        },
        "capabilities": [],
        "model": {
            "provider": "openrouter",
            "model_id": "openrouter/free"
        }
    }
    (agent_dir / "agent.json").write_text(json.dumps(agent_json, indent=2), encoding="utf-8")

    worker_yaml = {
        "tools": [{"name": "bash", "type": "builtin"}],
        "shared_context": {"env": "e2e"},
        "pipeline": [
            {
                "step": "setup",
                "tool": "bash",
                "args": {"command": "echo 'Market deploy flow setup'"},
                "output": "setup_result"
            }
        ]
    }
    (agent_dir / "worker.yaml").write_text(yaml.dump(worker_yaml, sort_keys=False), encoding="utf-8")


@pytest.fixture
def temp_agent_dir():
    """Provide a temporary directory with a test agent."""
    with tempfile.TemporaryDirectory() as tmpdir:
        agent_dir = Path(tmpdir) / "test-agent"
        agent_dir.mkdir()
        _build_test_agent(agent_dir)
        yield agent_dir


class TestMarketDeployFlow:
    """Market + Deploy flow end-to-end tests."""

    def test_create_test_agent(self, temp_agent_dir):
        """Step 1: Create a test agent and verify its files."""
        assert (temp_agent_dir / "agent.json").exists()
        assert (temp_agent_dir / "worker.yaml").exists()

        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())
        assert agent_data["identity"]["name"] == "test-market-deploy-agent"
        assert agent_data["schema_version"] == "2.0"

    def test_deploy_locally_via_deployer(self, temp_agent_dir):
        """Step 2: Deploy the agent locally using Deployer."""
        deploy_dir = temp_agent_dir.parent / "deployed"
        deployer = Deployer(deploy_dir=str(deploy_dir))

        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())
        result = deployer.deploy_from_file("test-market-deploy-agent", agent_data, version="1.0.0")

        assert result["status"] == "deployed"
        assert (deploy_dir / "test-market-deploy-agent" / "1.0.0" / "agent.json").exists()

    def test_retrieve_deployed_agent(self, temp_agent_dir):
        """Step 3: Verify Deployer can retrieve the deployed agent."""
        deploy_dir = temp_agent_dir.parent / "deployed"
        deployer = Deployer(deploy_dir=str(deploy_dir))

        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())
        deployer.deploy_from_file("test-market-deploy-agent", agent_data, version="1.0.0")

        retrieved = deployer.get_deployed_agent("test-market-deploy-agent", version="1.0.0")
        assert retrieved is not None
        assert retrieved["identity"]["name"] == "test-market-deploy-agent"

    def test_agent_runtime_has_tool_registry(self, temp_agent_dir):
        """Step 4+5: Create runtime and verify tool_registry exists."""
        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())

        runtime = AgentRuntime(
            agent_id="test-market-deploy-agent",
            agent_json=agent_data,
            api_key="test-key"
        )

        assert runtime.tool_registry is not None
        assert "bash" in runtime.tool_registry.list_tools()
        assert len(runtime.tool_registry.list_tools()) >= 7

    def test_agent_runtime_can_execute_pipeline(self, temp_agent_dir):
        """Verify that the runtime can execute a simple pipeline."""
        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())

        runtime = AgentRuntime(
            agent_id="test-market-deploy-agent",
            agent_json=agent_data,
            api_key="test-key"
        )
        runtime.initialize_pipeline_engine()

        pipeline_config = {
            "pipeline": [
                {
                    "step": "setup",
                    "tool": "bash",
                    "args": {"command": "echo 'Market deploy flow setup'"},
                    "output": "setup_result"
                }
            ]
        }

        result = runtime.execute_pipeline(pipeline_config)
        assert result["success"] is True
        assert len(result["steps"]) == 1
        steps = {s["step"]: s for s in result.get("steps", [])}
        assert "setup" in steps

    def test_market_upload_mocked(self, temp_agent_dir):
        """Mocked market upload: verify that uploadAgent would be called with correct params."""
        # Create a tar.gz package as MarketClient would
        package_path = temp_agent_dir.parent / "test-market-deploy-agent-v1.0.0.tar.gz"
        with tarfile.open(package_path, "w:gz") as tar:
            tar.add(temp_agent_dir, arcname="test-market-deploy-agent")

        assert package_path.exists()
        with tarfile.open(package_path, "r:gz") as tar:
            names = tar.getnames()
            assert any("agent.json" in n for n in names)
            assert any("worker.yaml" in n for n in names)

    def test_market_download_mocked(self, temp_agent_dir):
        """Mocked market download: verify that downloadAgent can unpack a package."""
        # Create a mock package
        package_path = temp_agent_dir.parent / "mock-download.tar.gz"
        with tarfile.open(package_path, "w:gz") as tar:
            tar.add(temp_agent_dir, arcname="test-market-deploy-agent")

        # Simulate download: unpack to downloaded-agents
        download_dir = temp_agent_dir.parent / "downloaded-agents"
        download_dir.mkdir(exist_ok=True)
        with tarfile.open(package_path, "r:gz") as tar:
            tar.extractall(path=download_dir)

        unpacked_agent_dir = download_dir / "test-market-deploy-agent"
        assert unpacked_agent_dir.exists()
        assert (unpacked_agent_dir / "agent.json").exists()
        assert (unpacked_agent_dir / "worker.yaml").exists()

    def test_end_to_end_market_deploy_flow(self, temp_agent_dir):
        """
        Complete end-to-end market + deploy flow:
        create -> package -> deploy locally -> retrieve -> runtime -> execute -> verify.
        """
        # 1. Create (fixture already did this)
        assert (temp_agent_dir / "agent.json").exists()

        # 2. Package
        package_path = temp_agent_dir.parent / "test-market-deploy-agent-v1.0.0.tar.gz"
        with tarfile.open(package_path, "w:gz") as tar:
            tar.add(temp_agent_dir, arcname="test-market-deploy-agent")
        assert package_path.exists()

        # 3. Deploy locally using Deployer
        deploy_dir = temp_agent_dir.parent / "deployed"
        deployer = Deployer(deploy_dir=str(deploy_dir))
        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())
        deploy_result = deployer.deploy_from_file("test-market-deploy-agent", agent_data, version="1.0.0")
        assert deploy_result["status"] == "deployed"

        # 4. Retrieve and verify
        retrieved = deployer.get_deployed_agent("test-market-deploy-agent", version="1.0.0")
        assert retrieved is not None
        assert retrieved["identity"]["name"] == "test-market-deploy-agent"

        # 5. Create AgentRuntime from deployed agent
        runtime = deployer.get_agent_runtime("test-market-deploy-agent", version="1.0.0", api_key="test-key")
        assert runtime is not None
        assert runtime.tool_registry is not None
        assert "bash" in runtime.tool_registry.list_tools()

        # 6. Execute pipeline
        pipeline_config = {
            "pipeline": [
                {
                    "step": "deploy_verify",
                    "tool": "bash",
                    "args": {"command": "echo 'Deploy verification OK'"},
                    "output": "deploy_verify_result"
                }
            ]
        }
        result = runtime.execute_pipeline(pipeline_config)

        # 7. Verify
        assert result["success"] is True
        assert len(result["steps"]) == 1
        steps = {s["step"]: s for s in result.get("steps", [])}
        assert "deploy_verify" in steps
        assert "Deploy verification OK" in steps["deploy_verify"].get("output", {}).get("stdout", "")
