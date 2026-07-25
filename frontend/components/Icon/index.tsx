// Icons
import StatusIcon from "@/assets/icons/statusIcon.svg";
import PersonIcon from "@/assets/icons/person.svg";
import CalendarIcon from "@/assets/icons/calendar.svg";
import SearchIcon from "@/assets/icons/search.svg";
import ExportIcon from "@/assets/icons/exportIcon.svg";
import ArrowLeft from "@/assets/icons/arrowLeft.svg";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
    statusIcon: StatusIcon,
    person: PersonIcon,
    calendar: CalendarIcon,
    search: SearchIcon,
    export: ExportIcon,
    arrowLeft: ArrowLeft,
};

const Icon = ({ icon }: { icon: string }) => {
    const IconComponent = ICON_MAP[icon];

    if (!IconComponent) return null;

    return (
        <IconComponent />
    )
}

export default Icon
