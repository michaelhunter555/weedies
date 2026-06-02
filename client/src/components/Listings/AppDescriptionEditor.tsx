"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import FormatStrikethroughIcon from "@mui/icons-material/FormatStrikethrough";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  isAppDescriptionValid,
  toEditorHtml,
} from "@/lib/sanitize-html";

type Props = {
  value: string;
  onChange: (html: string, isValid: boolean) => void;
  disabled?: boolean;
  minPlainText?: number;
};

export function AppDescriptionEditor({
  value,
  onChange,
  disabled = false,
  minPlainText = 40,
}: Props) {
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const lastEmittedHtml = React.useRef<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content: toEditorHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmittedHtml.current = html;
      onChangeRef.current(html, isAppDescriptionValid(html, minPlainText));
    },
  });

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  React.useEffect(() => {
    if (!editor) return;
    if (value === lastEmittedHtml.current) return;
    const next = toEditorHtml(value);
    if (next === editor.getHTML()) return;
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmittedHtml.current = editor.getHTML();
  }, [editor, value]);

  if (!editor) {
    return (
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          minHeight: 168,
          bgcolor: "action.hover",
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <Stack
        direction="row"
        spacing={0.25}
        alignItems="center"
        sx={{
          px: 0.5,
          py: 0.25,
          borderBottom: 1,
          borderColor: "divider",
          flexWrap: "wrap",
        }}
      >
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FormatBoldIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FormatItalicIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <FormatStrikethroughIcon fontSize="small" />
        </ToolbarButton>
        <Divider flexItem orientation="vertical" sx={{ mx: 0.5 }} />
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FormatListBulletedIcon fontSize="small" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FormatListNumberedIcon fontSize="small" />
        </ToolbarButton>
      </Stack>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          minHeight: 168,
          maxHeight: 360,
          overflowY: "auto",
          "& .tiptap": {
            outline: "none",
            minHeight: 140,
            fontSize: "1rem",
            lineHeight: 1.6,
            "& p": { margin: "0 0 0.75em" },
            "& p:last-child": { marginBottom: 0 },
            "& ul, & ol": { paddingLeft: "1.5rem", margin: "0 0 0.75em" },
            "& h2": { fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5em" },
            "& h3": { fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5em" },
            "& blockquote": {
              borderLeft: "3px solid",
              borderColor: "divider",
              pl: 2,
              ml: 0,
              color: "text.secondary",
            },
          },
          "& .tiptap p.is-editor-empty:first-child::before": {
            color: "text.disabled",
            content: "attr(data-placeholder)",
            float: "left",
            height: 0,
            pointerEvents: "none",
          },
        }}
      >
        <EditorContent
          editor={editor}
          data-placeholder={`Describe your app (min ${minPlainText} characters).
• What does it do?
• Who is it for?
• What's included in the sale?`}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ px: 2, pb: 1, display: "block" }}>
        Use the toolbar for basic formatting. Links to your app/website are ok. Scripts are not allowed.
      </Typography>
    </Box>
  );
}

function ToolbarButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={onClick}
          color={active ? "primary" : "default"}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}
