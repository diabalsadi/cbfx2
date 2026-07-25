const formatNumber = (number: number) => {
    return number.toLocaleString('en-US');
}

const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

const formatNumberWithCharacter = (number: number) => {
    if (number >= 1000 && number < 1000000) {
        return `${(number / 1000).toFixed(0)}k`;
    } else if (number >= 1000000 && number < 1000000000) {
        return `${(number / 1000000).toFixed(0)}m`;
    } else if (number >= 1000000000) {
        return `${(number / 1000000000).toFixed(0)}b`;
    }

    return number.toLocaleString('en-US');
}


export {
    formatNumber,
    formatNumberWithCharacter,
    formatDate
}