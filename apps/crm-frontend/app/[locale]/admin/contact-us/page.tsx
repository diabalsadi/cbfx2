import { useTranslations } from "next-intl";
import styles from "./ContactUs.module.scss";
import AddressIcon from "@/assets/icons/addressIcon.svg";
import PhoneIcon from "@/assets/icons/phoneIcon.svg";
import EmailIcon from "@/assets/icons/emailIcon.svg";

const ContactUs = () => {
  const t = useTranslations("adminContactUs");

  const info = [
    { title: t("address"), value: "123 Main St, Anytown, USA", icon: AddressIcon },
    { title: t("phone"), value: "+1 (555) 123-4567", icon: PhoneIcon },
    { title: t("email"), value: "info@example.com", icon: EmailIcon },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("title")}</h1>
      <div className={styles.contactContainer}>
        <div className={styles.location}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d17691.23926105935!2d35.88355437238305!3d32.53950057680667!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151c76f0573efd0b%3A0xa49ded1f5dbe5871!2sMARSRobotics!5e0!3m2!1sar!2sjo!4v1744405256436!5m2!1sar!2sjo"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        <form action="" className={styles.contactForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="subject" className={styles.label}>
              {t("subject")}
            </label>
            <input
              id="subject"
              type="text"
              placeholder={t("subjectPlaceholder")}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="urgency" className={styles.label}>
              {t("urgency")}
            </label>
            <select name="" id="urgency" className={styles.select}>
              <option value="">{t("selectUrgency")}</option>
              <option value="normal">{t("normal")}</option>
              <option value="high">{t("high")}</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="message" className={styles.label}>
              {t("message")}
            </label>
            <textarea
              name=""
              id="message"
              placeholder={t("messagePlaceholder")}
              required
              className={styles.textarea}
            ></textarea>
          </div>

          <button type="submit" className={styles.button}>
            {t("sendMessage")}
          </button>
        </form>
      </div>
      <div className={styles.contactInfo}>
        {info.map((item, index) => (
          <div key={index} className={styles.contactInfoItem}>
            <item.icon />
            <div>
              <h3>{item.title}</h3>
              <p>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactUs;
