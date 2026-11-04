(set-logic ALL)

(declare-datatypes () ((Status Pending Approved Cancelled)))
(declare-const before Status)
(declare-const after Status)
(declare-const granted Bool)

; The only transitions from Pending are approve and cancel.
(assert (= before Pending))
(assert
  (or
    (and (= after Approved) (= granted true))
    (and (= after Cancelled) (= granted true))))

; Ask Z3 for a cancelled state that nevertheless grants access.
(push)
(assert (= after Cancelled))
(assert granted)
(check-sat)
(pop)

; The transition relation itself is satisfiable.
(check-sat)
(get-model)
