---- MODULE Approval ----
VARIABLES status, granted

vars == <<status, granted>>

Init ==
  /\ status = "pending"
  /\ granted = FALSE

Approve ==
  /\ status = "pending"
  /\ status' = "approved"
  /\ granted' = TRUE

Cancel ==
  /\ status = "pending"
  /\ status' = "cancelled"
  /\ granted' = FALSE

Finish ==
  /\ status \in {"approved", "cancelled"}
  /\ UNCHANGED vars

Next == Approve \/ Cancel \/ Finish

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ status \in {"pending", "approved", "cancelled"}
  /\ granted \in BOOLEAN

CancelledNeverGrants == status = "cancelled" => ~granted

====
