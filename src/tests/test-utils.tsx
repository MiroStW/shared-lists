import React, { ReactElement } from "react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { render, RenderOptions } from "@testing-library/react";
import { SessionContextProvider } from "app/sessionContext";
import { AppRouterContextProviderMock } from "./mocks/AppRouterMock";

const ContextWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AppRouterContextProviderMock>
      <SessionContextProvider>{children}</SessionContextProvider>
    </AppRouterContextProviderMock>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: ContextWrapper, ...options });

// eslint-disable-next-line import/no-extraneous-dependencies
export * from "@testing-library/react";
export { customRender as render };
