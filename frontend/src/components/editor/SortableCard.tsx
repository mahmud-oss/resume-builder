"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

import { GripIcon } from "./Icons";
import { IconButton } from "./ui";

/** A card that can be dragged by its grip (mouse, touch, or keyboard: Space, arrows, Space). */
export function SortableCard({
  id,
  children,
  className = "",
}: {
  id: string;
  className?: string;
  children: (grip: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const grip = (
    <IconButton
      label="Drag to reorder"
      ref={setActivatorNodeRef}
      className="cursor-grab touch-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripIcon />
    </IconButton>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`${className} ${isDragging ? "shadow-lg ring-2 ring-brand/40" : ""}`}
    >
      {children(grip)}
    </div>
  );
}
