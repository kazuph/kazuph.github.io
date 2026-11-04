module approval {
  type Status = Pending | Approved | Cancelled

  var status: Status
  var granted: bool

  action init = all {
    status' = Pending,
    granted' = false,
  }

  action approve = all {
    status == Pending,
    status' = Approved,
    granted' = true,
  }

  action cancel = all {
    status == Pending,
    status' = Cancelled,
    granted' = true,
  }

  action step = any {
    approve,
    cancel,
  }

  val cancelledNeverGrants = status != Cancelled or not(granted)
}
