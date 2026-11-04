inductive Status where
  | pending
  | approved
  | cancelled
  deriving Repr, DecidableEq

inductive Event where
  | approve
  | cancel

def step : Status -> Event -> Status × Bool
  | .pending, .approve => (.approved, true)
  | .pending, .cancel => (.cancelled, true)
  | status, _ => (status, false)

theorem cancelledNeverGrants (event : Event) :
    (step .cancelled event).2 = false := by
  cases event <;> rfl

def main : IO Unit := do
  let result : Status × Bool := step .pending .cancel
  IO.println s!"status={repr result.1}, granted={result.2}"
