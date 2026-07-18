import assert from 'node:assert/strict';
import test from 'node:test';

import { selectRelevantContext } from '../functions/_shared/resume-context.js';

const context = {
    name: 'Candidate',
    currentRole: 'Engineer',
    summary: 'Summary',
    experience: ['Experience'],
    hobbies: ['Hiking'],
    skills: { technical: ['JavaScript'] },
};

test('selectRelevantContext returns only the matched section plus identity fields', () => {
    const selected = selectRelevantContext('What are your hobbies?', context);

    assert.deepEqual(selected, {
        name: 'Candidate',
        currentRole: 'Engineer',
        summary: 'Summary',
        hobbies: ['Hiking'],
    });
});

test('selectRelevantContext returns useful defaults for unmatched questions', () => {
    const selected = selectRelevantContext('Tell me something interesting.', context);

    assert.deepEqual(selected.experience, ['Experience']);
    assert.deepEqual(selected.skills, { technical: ['JavaScript'] });
});

test('keyword matching respects word boundaries', () => {
    const selected = selectRelevantContext('This is pleading language.', context, {
        leadership: { keywords: ['lead'], sections: ['hobbies'] },
        experience: { keywords: [], sections: ['experience'] },
        skills: { keywords: [], sections: ['skills'] },
    });

    assert.equal(selected.hobbies, undefined);
});
