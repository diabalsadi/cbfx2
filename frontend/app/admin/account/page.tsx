"use client"
import { useState } from "react";
// Components
import Form from "@/components/Form"
import Card from "@/components/Card";
// Styles
import styles from "./AccountAdmin.module.scss"
import cx from "classnames";

// Icons
import IdentityCardIcon from "@/assets/icons/identityCard.svg";
import SecurityIcon from "@/assets/icons/security.svg";

const AccountAdmin = () => {
    const [activeForm, setActiveForm] = useState<number>(0);

    const formTypes = [
        {
            title: "Personal Info",
            icon: <IdentityCardIcon />,
            description: "Update your personal information and profile picture",
            fields: [
                {
                    name: "icon",
                    type: "file",
                    placeholder: "Profile Picture",
                    isRequired: true,
                    toolTipText: "Icon",
                },
                {
                    name: "name",
                    type: "text",
                    placeholder: "FullName",
                    isRequired: true,
                    toolTipText: "Name",
                },
                {
                    name: "email",
                    type: "email",
                    placeholder: "Email Address",
                    isRequired: true,
                    toolTipText: "Email",
                },
                {
                    name: "role",
                    type: "select",
                    placeholder: "Account Role",
                    isRequired: true,
                    toolTipText: "Role",
                    options: ["Admin", "User", "Manager"],
                },
            ]
        },
        {
            title: "Security",
            icon: <SecurityIcon />,
            description: "Manage your password and account security settings",
            fields: [
                {
                    name: "currentPassword",
                    type: "password",
                    placeholder: "Current Password",
                    isRequired: true,
                    toolTipText: "Current Password",
                },
                {
                    name: "newPassword",
                    type: "password",
                    placeholder: "New Password",
                    isRequired: true,
                    toolTipText: "New Password",
                },
                {
                    name: "confirmPassword",
                    type: "password",
                    placeholder: "Confirm New Password",
                    isRequired: true,
                    toolTipText: "Confirm Password",
                },
            ]
        }
    ]

    return <div className={styles.container}>
        <div className={styles.formType}>
            {formTypes.map((formType, index) => (
                <Card
                    className={styles.formTypeCard}
                    isActive={activeForm === index}
                    isHoverable={true}
                    key={index}
                    onClick={() => setActiveForm(index)}
                >
                    <div className={styles.cardContent}>
                        <div className={styles.iconWrapper}>
                            {formType.icon}
                        </div>
                        <div className={styles.textWrapper}>
                            <h3>{formType.title}</h3>
                            <p>{formType.description}</p>
                        </div>
                    </div>
                </Card>
            ))}
        </div>

        <div className={styles.formContainer} key={activeForm}>
            <Form
                title={formTypes[activeForm].title}
                fields={formTypes[activeForm].fields}
                action={async (formData) => {
                    console.log(Object.fromEntries(formData));
                }}
            />
        </div>
    </div>
}

export default AccountAdmin
