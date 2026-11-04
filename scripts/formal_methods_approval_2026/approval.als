enum Status { Pending, Approved, Cancelled }
enum Grant { Denied, Granted }

sig User {}

sig Request {
  owner: one User,
  approver: one User,
  status: one Status,
  grant: one Grant
}

fact DistinctRoles {
  all r: Request | r.owner != r.approver
}

fact GrantMatchesStatus {
  all r: Request | r.grant = Granted iff r.status = Approved
}

assert CancelledNeverGrants {
  all r: Request | r.status = Cancelled implies r.grant = Denied
}

check CancelledNeverGrants for 4
