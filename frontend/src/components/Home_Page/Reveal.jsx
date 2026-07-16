import { memo, useEffect, useRef, useState } from "react";

/* ─── Shared singleton IntersectionObserver ─── */
const observerCallbacks = new Map();
let sharedIO = null;

function getObserver() {
  if (!sharedIO) {
    sharedIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const cb = observerCallbacks.get(entry.target);
          if (cb) cb(entry);
        });
      },
      { threshold: 0.15 }
    );
  }
  return sharedIO;
}

export default memo(function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    observerCallbacks.set(el, (entry) => {
      if (entry.isIntersecting) {
        setShow(true);
        getObserver().unobserve(el);
        observerCallbacks.delete(el);
      }
    });

    getObserver().observe(el);

    return () => {
      getObserver().unobserve(el);
      observerCallbacks.delete(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      ].join(" ")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
});
