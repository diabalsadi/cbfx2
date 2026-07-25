import styles from "./PageTitle.module.scss";

const PageTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => {
    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
    );
};

export default PageTitle;