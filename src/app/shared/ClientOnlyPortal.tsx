import { useRef, useEffect, useState, PropsWithChildren } from "react";
import { createPortal } from "react-dom";

/**
 *
 * @param selector: string - the selector of the element to render the children into
 * @returns null if the element is not found, otherwise the children
 */
const ClientOnlyPortal = ({
  children,
  selector,
}: PropsWithChildren<{ selector: string }>) => {
  const ref = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    ref.current = document.querySelector(selector) || null;
    setMounted(true);
  }, [selector]);

  return mounted && ref.current ? createPortal(children, ref.current) : null;
};

export default ClientOnlyPortal;
