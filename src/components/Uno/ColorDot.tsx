import { COLOR_DOT_CLASS } from './constants';

interface Props {
    color: string;
    className?: string;
}

export default function ColorDot({ color, className = 'w-6 h-6' }: Props) {
    const cls = COLOR_DOT_CLASS[color];
    if (!cls) return null;
    return <span className={`inline-block rounded-full ${cls} ${className} align-middle`} />;
}
