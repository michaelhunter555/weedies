import React from "react";

import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

const TextFieldInput: React.FC<{
  id: string;
  name: string;
  type: string;
  title: string;
  hasAdornment: boolean;
  defaultValue?: string | number | boolean | string[] | Record<string, any>[];
  value?: string | number | boolean | string[] | Record<string, any>[];
  step?: string;
  style?: boolean;
  inputHandler: (id: string, val: string | number, isValid: boolean) => void;
  adornmentValue?: string | number;
  helperText?: string;
  multiline?: boolean;
  rows?: number;
}> = ({
  inputHandler,
  name,
  type,
  id,
  title,
  defaultValue,
  hasAdornment,
  style,
  value,
  adornmentValue,
  helperText,
  step,
  multiline,
  rows,
}) => {
  return (
    <>
      {hasAdornment && (
        <>
          <Typography color="text.secondary">{title}</Typography>
          <TextField
            helperText={helperText || ""}
            sx={{ padding: style ? 0 : "", width: "100%" }}
            id={id}
            name={name}
            type={type}
            fullWidth
            defaultValue={defaultValue}
            value={value}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    {adornmentValue ? adornmentValue : "$"}
                  </InputAdornment>
                ),
              },
              htmlInput: {
                step: step ? step : "0.01",
                ...(type === "number" && step ? { min: 1 } : {}),
              },
            }}
            onChange={(event: any) =>
              inputHandler(
                id,
                event.target.value as number,
                event.target.value > 0
              )
            }
          />
        </>
      )}

      {!hasAdornment && (
        <>
          <Typography color="text.secondary">{title}</Typography>
          <TextField
            helperText={helperText || ""}
            sx={{
              ".css-1t8l2tu-MuiInputBase-input-MuiOutlinedInput-input": {
                padding: style ? 0 : "",
              },
              ".css-p51h6s-MuiInputBase-input-MuiOutlinedInput-input": {
                padding: style ? 0 : "",
              },
            }}
            id={id}
            name={name}
            type={type}
            value={value}
            multiline={multiline}
            defaultValue={defaultValue}
            rows={multiline ? rows : 1}
            onChange={(event: any) =>
              inputHandler(
                id,
                event.target.value || event.target.checked,
                event.target.checked === true ||
                  event.target.checked === false ||
                  event.target.value.length > 0
              )
            }
          />
        </>
      )}
    </>
  );
};

export default TextFieldInput;
