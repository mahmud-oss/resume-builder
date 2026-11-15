"use client";

import { createContext, useContext } from "react";

import type { Design } from "@/lib/resume/types";

/** Tells the form whether to show a style button beside each field (editor version B). */
export type StyleUi = { enabled: boolean; styles: Design["styles"] };

export const StyleUiContext = createContext<StyleUi>({ enabled: false, styles: {} as Design["styles"] });
export const useStyleUi = () => useContext(StyleUiContext);
