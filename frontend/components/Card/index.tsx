// Styles
import style from './Card.module.scss';
import cx from 'classnames';

interface ICardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    isActive?: boolean
    isHoverable?: boolean
}

const Card = ({ children, className, isActive, isHoverable, ...props }: ICardProps) => {
    return (
        <div
            {...props}
            className={cx(style.container, className, {
                [style.active]: isActive,
                [style.isHoverable]: isHoverable
            })}
        >
            {children}
        </div>
    )
}

export default Card
