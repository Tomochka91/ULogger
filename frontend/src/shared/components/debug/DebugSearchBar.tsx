import { IconButton, InputAdornment } from "@mui/material";
import { BsSearch, BsX } from "react-icons/bs";

import { FormInput } from "../form/FormInput/FormInput";

/**
 * src/shared/components/debug/DebugSearchBar.tsx
 *
 * Search input used on the Debug page to filter log messages.
 *
 * Responsibilities:
 * - Render a controlled text input for searching within logs
 * - Display a search icon at the start of the input
 * - Display a clear ("X") button when the input has a value
 * - Emit updates to the parent via `onChange`
 *
 * Design notes:
 * - Controlled component: value is fully managed by the parent
 * - Does not perform filtering itself; it only collects user input
 * - Uses FormInput (app-styled wrapper) to keep consistent typography and spacing
 *
 * UI details:
 * - Start adornment: search icon (BsSearch)
 * - End adornment: clear icon button (BsX) only when `value.length > 0`
 * - Accessibility: clear button includes `aria-label`
 */

/* --------------------------------- Props ---------------------------------- */
/**
 * DebugSearchBarProps
 *
 * @property value    - Current search query string
 * @property onChange - Callback invoked with the next value
 */

type DebugSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

/* ------------------------------ Component ---------------------------------- */
export function DebugSearchBar({ value, onChange }: DebugSearchBarProps) {
  /**
   * Forward native input changes as a string to the parent.
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  /**
   * Clear the search input.
   */
  const handleClear = () => {
    onChange("");
  };

  return (
    <FormInput
      fullWidth
      size="small"
      variant="outlined"
      placeholder="Search logs"
      value={value}
      onChange={handleChange}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start" sx={{ paddingLeft: "5px" }}>
              <BsSearch />
            </InputAdornment>
          ),
          endAdornment:
            value.length > 0 ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  size="small"
                  onClick={handleClear}
                >
                  <BsX />
                </IconButton>
              </InputAdornment>
            ) : (
              ""
            ),
        },
      }}
    />
  );
}
