import httpx

workspace_id = "HIRETRACK 001"
# Let's get the projects first to find a task id
response = httpx.get(f"http://localhost:8000/api/v1/workspaces/{workspace_id}/projects")
projects = response.json()
print("Projects:", projects)

if projects:
    project_id = projects[0]['id']
    # Get tasks
    tasks = httpx.get(f"http://localhost:8000/api/v1/workspaces/{workspace_id}/projects/{project_id}/tasks").json()
    print("Tasks:", tasks)
    
    if tasks:
        task_id = tasks[0]['id']
        # Try to patch
        patch_resp = httpx.patch(
            f"http://localhost:8000/api/v1/workspaces/{workspace_id}/projects/tasks/{task_id}",
            json={"status": "In Progress"}
        )
        print("Patch status:", patch_resp.status_code)
        print("Patch body:", patch_resp.text)
