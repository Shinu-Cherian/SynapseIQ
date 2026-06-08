from app.modules.projects.models import Project, ProjectTask

def test_project_model():
    """
    Verifies that Project models can be correctly instantiated.
    """
    project = Project(
        workspace_id="TECHNOVA-001",
        name="Internal Dashboard",
        description="A dashboard for company metrics",
        status="Active"
    )
    assert project.workspace_id == "TECHNOVA-001"
    assert project.name == "Internal Dashboard"
    assert project.status == "Active"

def test_project_task_model():
    """
    Verifies that ProjectTask models can be instantiated with appropriate statuses.
    """
    task = ProjectTask(
        project_id=1,
        title="Implement OAuth",
        description="Write JWT login scripts",
        status="To Do",
        assignee_id=5
    )
    assert task.project_id == 1
    assert task.title == "Implement OAuth"
    assert task.status == "To Do"
    assert task.assignee_id == 5
