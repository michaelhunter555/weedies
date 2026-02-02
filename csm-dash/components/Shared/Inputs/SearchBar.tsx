"use client";

import { useState } from "react";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import OutlinedInput from "@mui/material/OutlinedInput";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import IconButton from "@mui/material/IconButton";

type SearchBarProps = {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialQuery?: string;
};

export default function SearchBar({ onSearch, placeholder = "Search…", initialQuery = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <FormControl sx={{ width: { xs: "100%", md: "35ch" } }} variant="outlined">
        <OutlinedInput
          size="small"
          id="universal-search"
          placeholder={placeholder}
          sx={{ flexGrow: 1 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startAdornment={
            <InputAdornment position="start" sx={{ color: "text.primary" }}>
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          }
          endAdornment={
            <InputAdornment position="end">
              <IconButton type="submit" edge="end" aria-label="submit search">
                <SearchRoundedIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          }
          inputProps={{ "aria-label": "search" }}
        />
      </FormControl>
    </form>
  );
}


