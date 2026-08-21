import unittest

from sena_status import build_status_payload, get_sena_status, publish_status


class SenaStatusTests(unittest.TestCase):
    def test_build_status_payload_marks_working_when_any_worker_is_working(self):
        payload = build_status_payload({
            "workers": {
                "0": {"status": "WORKING"},
                "1": {"status": "NOT-WORKING"},
            }
        })

        self.assertEqual(payload["working_status"], "WORKING")
        self.assertEqual(payload["working_workers_count"], 1)
        self.assertEqual(payload["active_workers_count"], 2)

    def test_publish_status_updates_global_snapshot(self):
        publish_status({"workers": {"0": {"status": "NOT-WORKING"}}})
        snapshot = get_sena_status()

        self.assertEqual(snapshot["working_status"], "NOT-WORKING")
        self.assertTrue(snapshot["timestamp"])


if __name__ == "__main__":
    unittest.main()
