import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import { useRef, useState } from "react";

import Icon from "../Icon";
import styles from "./DateFilter.module.scss";

interface IDateFilterProps {
  label: string;
  icon?: string;
  onChange: (value: string) => void;
}

const DateFilter = ({ label, icon, onChange }: IDateFilterProps) => {
  const [value, setValue] = useState<Dayjs | null>(null);
  const [open, setOpen] = useState(false);

  const anchorRef = useRef<HTMLDivElement | null>(null);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className={styles.wrapper}>
        {/* Custom input (anchor) */}
        <div
          ref={anchorRef}
          className={styles.container}
          onClick={() => setOpen(true)}
        >
          <input
            readOnly
            value={value ? dayjs(value).format("MM/DD/YYYY") : ""}
            placeholder={label}
            className={styles.selectOption}
          />

          {icon && (
            <span className={styles.icon}>
              <Icon icon={icon} />
            </span>
          )}
        </div>

        {/* Real DatePicker */}
        <DatePicker
          open={open}
          onClose={() => setOpen(false)}
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
            onChange(newValue ? dayjs(newValue).format("YYYY-MM-DD") : "");
            setOpen(false);
          }}
          slotProps={{
            textField: {
              sx: {
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                width: 0,
                height: 0,
              },
            },
            popper: {
              anchorEl: anchorRef.current,
              placement: "bottom-start",
            },
          }}
        />
      </div>
    </LocalizationProvider>
  );
};

export default DateFilter;
