"use client";
// React
import { useFormStatus } from "react-dom";
// Styles
import styles from "./Form.module.scss";
import cx from "classnames";
import { useState, useRef } from "react";

interface IFormProps {
  fields: {
    name: string;
    type: string;
    value?: string;
    placeholder: string;
    isRequired: boolean;
    toolTipText: string;
    verificationRegx?: string;
    options?: string[];
  }[];
  title?: string;
  action: (formData: FormData) => void | Promise<void>;
}

const SubmitButton = () => {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submitBtn}>
      {pending ? "Submitting..." : "Submit"}
    </button>
  );
};

const Form = ({ fields, title, action }: IFormProps) => {
  const [previews, setPreviews] = useState<{ [key: string]: string | null }>(
    {},
  );
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    fieldName: string,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviews((prev) => ({ ...prev, [fieldName]: url }));
    }
  };

  const handleRemove = (fieldName: string) => {
    setPreviews((prev) => ({ ...prev, [fieldName]: null }));
    if (fileInputRefs.current[fieldName]) {
      fileInputRefs.current[fieldName]!.value = "";
    }
  };

  const renderField = (field: any) => {
    if (field.type === "file") {
      const preview = previews[field.name];
      return (
        <div className={styles.avatarUpload}>
          <div className={styles.avatarPreview}>
            <div className={styles.avatarCircle}>
              {preview ? (
                <img src={preview} alt="Profile" />
              ) : (
                <div className={styles.avatarInitial}>
                  {field.placeholder.charAt(0)}
                </div>
              )}
            </div>
          </div>
          <div className={styles.avatarActions}>
            <input
              type="file"
              name={field.name}
              ref={(el) => {
                fileInputRefs.current[field.name] = el;
              }}
              onChange={(e) => handleFileChange(e, field.name)}
              required={field.isRequired && !preview}
              className={styles.hiddenInput}
              accept="image/*"
            />
            <button
              type="button"
              className={styles.updateBtn}
              onClick={() => fileInputRefs.current[field.name]?.click()}
            >
              Update
            </button>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => handleRemove(field.name)}
            >
              <svg
                width="16"
                height="18"
                viewBox="0 0 16 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 18C2.45 18 1.97917 17.8042 1.5875 17.4125C1.19583 17.0208 1 16.55 1 16V3H0V1H5V0H11V1H16V3H15V16C15 16.55 14.8042 17.0208 14.4125 17.4125C14.0208 17.8042 13.55 18 13 18H3ZM13 3H3V16H13V3ZM5 14H7V5H5V14ZM9 14H11V5H9V14Z"
                  fill="currentColor"
                />
              </svg>
              Remove
            </button>
          </div>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <select
          name={field.name}
          required={field.isRequired}
          defaultValue={field.value || ""}
          className={styles.input}
        >
          <option value="" disabled>
            {field.placeholder}
          </option>
          {field.options?.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type}
        name={field.name}
        defaultValue={field.value}
        placeholder={field.placeholder}
        required={field.isRequired}
        className={styles.input}
        {...(field.verificationRegx && { pattern: field.verificationRegx })}
      />
    );
  };

  return (
    <div className={styles.container}>
      {title && (
        <div className={styles.header}>
          <h2>{title}</h2>
        </div>
      )}

      <form action={action} className={styles.formContent}>
        <div className={styles.fieldsGrid}>
          {fields.map((field) => (
            <div key={field.name} className={styles.fieldWrapper}>
              <label htmlFor={field.name} className={styles.label}>
                {field.name}
              </label>
              {renderField(field)}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <SubmitButton />
        </div>
      </form>
    </div>
  );
};

export default Form;
