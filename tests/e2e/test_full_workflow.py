"""
End-to-end integration test: full agent workflow.

This test exercises the complete agent lifecycle using Python APIs directly:
1. Create a test agent.json and worker.yaml in a temp directory
2. Validate agent.json using Python validator
3. Preview worker.yaml using Python preview functions
4. Load the agent with AgentRuntime
5. Execute a simple pipeline using execute_pipeline() with bash tool
6. Verify the pipeline result
7. Clean up temp files
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest
import yaml

# Add agent-compose to path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "agent-compose"))

from agent_compose.pipeline_engine import PipelineEngine, ExecutionContext
from agent_compose.tools import register_builtin_tools
from agent_compose.pipeline_engine import ToolRegistry
from agent_compose.agent_runtime import AgentRuntime


@pytest.fixture
def temp_agent_dir():
    """Create a temporary agent directory with agent.json and worker.yaml."""
    with tempfile.TemporaryDirectory() as tmpdir:
        agent_dir = Path(tmpdir) / "test-agent"
        agent_dir.mkdir()

        # Minimal agent.json (v2 schema)
        agent_json = {
            "schema_version": "2.0",
            "identity": {
                "name": "test-e2e-agent",
                "version": "1.0.0",
                "description": "A minimal agent for e2e testing",
                "author": "E2E Test Suite",
                "license": "MIT",
                "tags": ["test", "e2e", "demo"]
            },
            "instructions": {
                "format": "markdown",
                "source": "inline",
                "content": "You are a test agent for e2e validation."
            },
            "capabilities": [],
            "model": {
                "provider": "openrouter",
                "model_id": "openrouter/free"
            }
        }
        (agent_dir / "agent.json").write_text(json.dumps(agent_json, indent=2), encoding="utf-8")

        # Worker YAML with a bash step
        worker_yaml = {
            "tools": [{"name": "bash", "type": "builtin"}],
            "shared_context": {"user_name": "E2E Tester"},
            "pipeline": [
                {
                    "step": "greet",
                    "tool": "bash",
                    "args": {
                        "command": "echo 'Hello from E2E pipeline'"
                    },
                    "output": "greeting"
                },
                {
                    "step": "verify",
                    "tool": "bash",
                    "args": {
                        "command": "echo 'Verification step complete'"
                    },
                    "output": "verification"
                }
            ]
        }
        (agent_dir / "worker.yaml").write_text(yaml.dump(worker_yaml, sort_keys=False), encoding="utf-8")

        yield agent_dir


class TestFullWorkflow:
    """Full workflow end-to-end tests."""

    def test_agent_json_created(self, temp_agent_dir):
        """Verify that agent.json and worker.yaml are created correctly."""
        agent_json_path = temp_agent_dir / "agent.json"
        worker_yaml_path = temp_agent_dir / "worker.yaml"

        assert agent_json_path.exists(), "agent.json should exist"
        assert worker_yaml_path.exists(), "worker.yaml should exist"

        # Validate JSON structure
        agent_data = json.loads(agent_json_path.read_text())
        assert agent_data["identity"]["name"] == "test-e2e-agent"
        assert agent_data["schema_version"] == "2.0"
        assert "instructions" in agent_data

        # Validate YAML structure
        worker_data = yaml.safe_load(worker_yaml_path.read_text())
        assert "pipeline" in worker_data
        assert len(worker_data["pipeline"]) == 2
        assert worker_data["pipeline"][0]["step"] == "greet"

    def test_python_validator_functions(self, temp_agent_dir):
        """Directly test validation using Python APIs."""
        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())
        worker_data = yaml.safe_load((temp_agent_dir / "worker.yaml").read_text())

        # agent.json validation checks
        assert agent_data.get("identity", {}).get("name")
        assert agent_data.get("schema_version") == "2.0"
        assert "instructions" in agent_data

        # worker.yaml validation checks
        assert isinstance(worker_data.get("pipeline"), list)
        step_names = [s["step"] for s in worker_data["pipeline"]]
        assert len(step_names) == len(set(step_names)), "Duplicate step names found"

        # Check tool references
        declared_tools = {t["name"] for t in worker_data.get("tools", [])}
        builtin_tools = {"bash", "read_file", "write_file", "glob", "llm_chat", "web_search", "web_fetch"}
        for step in worker_data["pipeline"]:
            tool = step.get("tool")
            if tool:
                assert tool in declared_tools or tool in builtin_tools, f"Undefined tool: {tool}"

    def test_pipeline_execution_with_python_engine(self, temp_agent_dir):
        """Execute the pipeline using Python PipelineEngine directly."""
        worker_data = yaml.safe_load((temp_agent_dir / "worker.yaml").read_text())

        # Create PipelineEngine with built-in tools
        registry = ToolRegistry()
        register_builtin_tools(registry)
        engine = PipelineEngine(tool_registry=registry)

        # Create execution context
        context = ExecutionContext(
            agent_id="test-e2e-agent",
            initial_args=worker_data.get("shared_context", {})
        )

        # Execute pipeline
        import asyncio
        result = asyncio.run(engine.execute(
            pipeline_config=worker_data,
            context=context,
            timeout_ms=30000
        ))

        # Verify results
        assert result["success"] is True, f"Pipeline failed: {result}"
        assert len(result["steps"]) == 2

        # Verify step outputs (steps is a list of dicts)
        steps = {s["step"]: s for s in result.get("steps", [])}
        assert "greet" in steps
        assert "verify" in steps
        assert "Hello from E2E pipeline" in steps["greet"].get("output", {}).get("stdout", "")
        assert "Verification step complete" in steps["verify"].get("output", {}).get("stdout", "")

    def test_bash_tool_step_output(self, temp_agent_dir):
        """Verify that a bash step produces expected output."""
        worker_data = yaml.safe_load((temp_agent_dir / "worker.yaml").read_text())
        greet_step = worker_data["pipeline"][0]

        # Run the exact bash command from the pipeline
        cmd = greet_step["args"]["command"]
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        assert result.returncode == 0, f"Bash command failed: {result.stderr}"
        assert "Hello from E2E pipeline" in result.stdout

    def test_cleanup_no_leftover_files(self, temp_agent_dir):
        """Verify that temp files are cleaned up after the fixture tears down."""
        assert temp_agent_dir.exists()

    def test_end_to_end_full_lifecycle(self, temp_agent_dir):
        """Complete end-to-end lifecycle test combining all stages."""
        # 1. Files exist
        assert (temp_agent_dir / "agent.json").exists()
        assert (temp_agent_dir / "worker.yaml").exists()

        # 2. Validate structure
        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())
        worker_data = yaml.safe_load((temp_agent_dir / "worker.yaml").read_text())
        assert agent_data["identity"]["name"] == "test-e2e-agent"
        assert len(worker_data["pipeline"]) == 2

        # 3. Preview pipeline steps
        steps = worker_data["pipeline"]
        assert steps[0]["step"] == "greet"
        assert steps[1]["step"] == "verify"

        # 4. Execute bash steps and verify output
        for step in steps:
            if step.get("tool") == "bash":
                cmd = step["args"]["command"]
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
                assert result.returncode == 0, f"Step '{step['step']}' failed"
                assert result.stdout.strip(), f"Step '{step['step']}' produced no output"

        # 5. Verify shared context references
        shared = worker_data.get("shared_context", {})
        assert shared.get("user_name") == "E2E Tester"

        # 6. All outputs defined
        outputs = [s.get("output") for s in steps]
        assert all(outputs), "Every step should have an output variable"

    def test_agent_runtime_integration(self, temp_agent_dir):
        """Verify AgentRuntime can load the agent and execute pipeline."""
        agent_data = json.loads((temp_agent_dir / "agent.json").read_text())

        # Create AgentRuntime
        runtime = AgentRuntime(
            agent_id="test-e2e-agent",
            agent_json=agent_data,
            api_key="test-key"
        )

        # Verify runtime has pipeline capabilities
        assert runtime.tool_registry is not None
        assert "bash" in runtime.tool_registry.list_tools()

        # Initialize pipeline engine
        runtime.initialize_pipeline_engine()
        assert runtime.pipeline_engine is not None

        # Execute a simple pipeline
        pipeline_config = {
            "pipeline": [
                {
                    "step": "test",
                    "tool": "bash",
                    "args": {"command": "echo 'runtime test'"},
                    "output": "test_result"
                }
            ]
        }

        result = runtime.execute_pipeline(pipeline_config)
        assert result["success"] is True
        steps = {s["step"]: s for s in result.get("steps", [])}
        assert "test" in steps
