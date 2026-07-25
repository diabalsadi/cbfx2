'use client';

import React, { useState } from 'react';
import styles from './CampaignCard.module.scss';
import cx from 'classnames';
import Card from '@/components/Card';
import StatusIcon from '@/assets/icons/statusIcon.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import SparklineChart from '@/components/SparklineChart';

interface CampaignCardProps {
    id: string;
    name: string;
    date: string;
    todaySpend: string;
    sessions: string;
    status: 'On Going' | 'Expired';
    endDate: string;
    url: string;
}

const CampaignCard: React.FC<CampaignCardProps> = ({
    id,
    name,
    date,
    todaySpend,
    sessions,
    status,
    endDate,
    url
}) => {
    const [copied, setCopied] = useState(false);
    const spendData = [12, 22, 18, 28, 15, 20, 25];
    const sessionsData = [30, 10, 40, 15, 50, 20, 60];

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className={styles.cardWrapper}>
            <Card isHoverable>
                {/* Left: ID + Name + Publish Date */}
                <div className={styles.mainInfo}>
                    <span className={styles.tag}>{id}</span>
                    <h3 className={styles.name}>{name}</h3>
                    <div className={styles.publishDate}>
                        <StatusIcon />
                        <span>Published on {date}</span>
                    </div>
                </div>

                {/* Center: Metrics (Spend & Sessions) */}
                <div className={styles.metricsContainer}>
                    <div className={styles.metricItem}>
                        <div className={styles.chartBox}>
                            <SparklineChart
                                data={spendData}
                                type="bar"
                                color="#4338ca"
                                width={100}
                                height={75}
                            />
                        </div>
                        <div className={styles.details}>
                            <span className={styles.value}>{todaySpend}</span>
                            <span className={styles.label}>Today Spend</span>
                        </div>
                    </div>

                    <div className={styles.metricItem}>
                        <div className={styles.chartBox}>
                            <SparklineChart
                                data={sessionsData}
                                type="line"
                                color="#4338ca"
                                width={100}
                                height={75}
                            />
                        </div>
                        <div className={styles.details}>
                            <span className={styles.value}>+{sessions}</span>
                            <span className={styles.label}>Sessions</span>
                        </div>
                    </div>
                </div>

                {/* Right: Status & End Date + Link Area */}
                <div className={styles.metaSection}>
                    <div className={styles.statusGrid}>
                        <div className={cx(styles.badge, status === 'On Going' ? styles.onGoing : styles.expired)}>
                            {status}
                        </div>
                        <div className={cx(styles.badge, styles.endDate)}>
                            {endDate}
                        </div>
                    </div>

                    <div
                        className={cx(styles.copyArea, { [styles.copied]: copied })}
                        onClick={handleCopy}
                        title="Click to copy link"
                    >
                        <div className={styles.iconWrapper}>
                            <CopyIcon />
                        </div>
                        <span className={styles.urlText}>
                            {copied ? 'Copied Link!' : url}
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default CampaignCard;
