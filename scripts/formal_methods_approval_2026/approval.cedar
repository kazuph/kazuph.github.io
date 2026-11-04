permit (
  principal == User::"approver",
  action == Action::"approve",
  resource is Request
);

permit (
  principal,
  action == Action::"read",
  resource is Request
) when {
  resource.status == "approved"
};

forbid (
  principal,
  action == Action::"read",
  resource is Request
) when {
  resource.status == "cancelled"
};
