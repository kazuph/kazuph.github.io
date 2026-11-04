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

-- 元の定理: 取消済みの状態から先では grant しない
theorem cancelledNeverGrants (event : Event) :
    (step .cancelled event).2 = false := by
  cases event <;> rfl

-- 強めた定理: どの状態からどの操作をしても、結果が取消済みなら grant しない
theorem cancelledResultNeverGrants (status : Status) (event : Event) :
    (step status event).1 = .cancelled → (step status event).2 = false := by
  cases status <;> cases event <;> decide

def main : IO Unit := do
  let result : Status × Bool := step .pending .cancel
  IO.println s!"status={repr result.1}, granted={result.2}"
