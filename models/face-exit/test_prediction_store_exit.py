import os
import tempfile

import prediction_store


def test_write_final_result_summary_creates_succinct_file():
    with tempfile.TemporaryDirectory() as tmpdir:
        output_path = os.path.join(tmpdir, 'final_result.txt')

        prediction_store.write_final_result_summary(
            label='Edward',
            avg_timestamp='2026-07-20T12:00:00',
            avg_score=0.87,
            output_path=output_path,
        )

        assert os.path.exists(output_path)
        with open(output_path, 'r', encoding='utf-8') as handle:
            content = handle.read().strip()
        assert 'Edward' in content
        assert '0.8700' in content
