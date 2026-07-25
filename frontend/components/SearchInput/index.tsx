import SearchIcon from "@/assets/icons/search.svg";
import styles from "./SearchInput.module.scss";

interface ISearchInputProps {
    placeholder: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchInput = ({ placeholder, onChange }: ISearchInputProps) => {
    return (
        <div className={styles.container}>
            <input
                type="text"
                placeholder={placeholder}
                onChange={onChange}
                className={styles.input}
            />
            <div className={styles.icon}>
                <SearchIcon />
            </div>
        </div>


    )
}

export default SearchInput
