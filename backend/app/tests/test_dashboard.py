from app.modules.dashboard.schemas import WorkloadStats

def test_workload_stats_overload():
    """
    Verifies that the WorkloadStats schema handles overload calculations correctly.
    """
    normal_workload = WorkloadStats(
        user_id=1,
        email="dev1@example.com",
        full_name="Developer One",
        active_tasks_count=3,
        is_overloaded=False
    )
    
    heavy_workload = WorkloadStats(
        user_id=2,
        email="dev2@example.com",
        full_name="Developer Two",
        active_tasks_count=8,
        is_overloaded=True
    )
    
    assert normal_workload.is_overloaded is False
    assert heavy_workload.is_overloaded is True
    assert normal_workload.active_tasks_count == 3
    assert heavy_workload.active_tasks_count == 8
