datatype Status = Pending | Approved | Cancelled

method Approve(status: Status) returns (next: Status, granted: bool)
  requires status == Pending
  ensures next == Approved
  ensures granted
{
  next, granted := Approved, true;
}

method Cancel(status: Status) returns (next: Status, granted: bool)
  requires status == Pending
  ensures next == Cancelled
  ensures !granted
{
  next, granted := Cancelled, true;
}

method Main()
{
  var next, granted := Cancel(Pending);
  print "status=", next, ", granted=", granted, "\n";
}
