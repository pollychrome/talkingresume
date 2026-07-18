const BASE_CONTEXT_FIELDS = ['name', 'currentRole', 'summary'];

export const CONTEXT_MAPPINGS = {
    leadership: {
        keywords: [
            'leadership',
            'lead',
            'manage',
            'management',
            'team',
            'manager',
            'director',
            'executive',
            'supervise',
            'staff',
        ],
        sections: [
            'tech_journey',
            'achievements.professional',
            'skills.Leadership',
            'skills.interview_responses',
        ],
    },
    technical: {
        keywords: [
            'technical',
            'technology',
            'tech',
            'product',
            'development',
            'software',
            'programming',
            'code',
            'system',
            'platform',
            'roadmap',
        ],
        sections: [
            'skills.technical',
            'achievements.professional',
            'tech_journey',
            'skills.interview_responses',
        ],
    },
    business: {
        keywords: [
            'business',
            'operations',
            'revenue',
            'finance',
            'strategy',
            'process',
            'optimization',
            'growth',
            'commercial',
        ],
        sections: [
            'skills.soft_skills',
            'achievements.professional',
            'tech_journey',
            'skills.interview_responses',
        ],
    },
    experience: {
        keywords: [
            'experience',
            'background',
            'history',
            'career',
            'work',
            'job',
            'role',
            'position',
            'company',
        ],
        sections: ['experience', 'tech_journey', 'achievements', 'expandedSummary'],
    },
    skills: {
        keywords: ['skills', 'abilities', 'expertise', 'competencies', 'capabilities', 'knowledge'],
        sections: ['skills', 'achievements.professional'],
    },
    personal: {
        keywords: ['hobby', 'hobbies', 'personal', 'interests', 'fun', 'free time', 'outside work'],
        sections: ['hobbies'],
    },
    education: {
        keywords: [
            'education',
            'degree',
            'school',
            'university',
            'certification',
            'certificate',
            'credential',
            'study',
        ],
        sections: ['skills.education', 'certifications'],
    },
    change: {
        keywords: [
            'change',
            'transformation',
            'modernization',
            'upgrade',
            'migration',
            'stakeholder',
            'resistance',
        ],
        sections: ['skills.interview_responses', 'achievements.professional'],
    },
    metrics: {
        keywords: [
            'metrics',
            'kpi',
            'performance',
            'measurement',
            'success',
            'targets',
            'analytics',
            'results',
        ],
        sections: ['skills.interview_responses', 'achievements.professional'],
    },
};

export function selectRelevantContext(message, fullContext, mappings = CONTEXT_MAPPINGS) {
    const normalizedMessage = message.toLocaleLowerCase();
    const relevantContext = {};

    for (const field of BASE_CONTEXT_FIELDS) {
        copyPath(fullContext, relevantContext, field);
    }

    const matchedMappings = Object.values(mappings).filter(({ keywords }) =>
        keywords.some((keyword) => containsKeyword(normalizedMessage, keyword)),
    );

    const selectedMappings = matchedMappings.length
        ? matchedMappings
        : [mappings.experience, mappings.skills].filter(Boolean);

    for (const { sections } of selectedMappings) {
        for (const section of sections) {
            copyPath(fullContext, relevantContext, section);
        }
    }

    return relevantContext;
}

function containsKeyword(message, keyword) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapedKeyword}([^\\p{L}\\p{N}_]|$)`, 'u').test(
        message,
    );
}

function copyPath(source, target, path) {
    const parts = path.split('.');
    let sourceCursor = source;

    for (const part of parts) {
        if (!isRecord(sourceCursor) || !Object.hasOwn(sourceCursor, part)) {
            return;
        }
        sourceCursor = sourceCursor[part];
    }

    if (sourceCursor === undefined || sourceCursor === null) {
        return;
    }

    let targetCursor = target;
    for (const part of parts.slice(0, -1)) {
        if (!isRecord(targetCursor[part])) {
            targetCursor[part] = {};
        }
        targetCursor = targetCursor[part];
    }

    targetCursor[parts.at(-1)] = sourceCursor;
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
