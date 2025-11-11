
import unittest
from sentiment_analyzer import RuleBasedSentimentAnalyzer

class TestRuleBasedSentimentAnalyzer(unittest.TestCase):
    
    def setUp(self):
        self.analyzer = RuleBasedSentimentAnalyzer()
    
    def test_positive_single_keyword(self):
        result = self.analyzer.analyze("good")
        self.assertEqual(result, 1.0)
    
    def test_positive_multiple_keywords(self):
        result = self.analyzer.analyze("great excellent amazing")
        self.assertEqual(result, 5.0)
    
    def test_strongly_positive(self):
        result = self.analyzer.analyze("fantastic outstanding perfect")
        self.assertEqual(result, 5.0)
    
    def test_negative_single_keyword(self):
        result = self.analyzer.analyze("bad")
        self.assertEqual(result, -2.0)
    
    def test_negative_multiple_keywords(self):
        result = self.analyzer.analyze("terrible awful horrible")
        self.assertEqual(result, -5.0)
    
    def test_strongly_negative(self):
        result = self.analyzer.analyze("worst disgusting terrible")
        self.assertEqual(result, -5.0)
    
    def test_neutral_keywords(self):
        result = self.analyzer.analyze("okay fine average")
        self.assertEqual(result, 0.0)
    
    def test_no_keywords(self):
        result = self.analyzer.analyze("the driver arrived")
        self.assertEqual(result, 0.0)
    
    def test_mixed_sentiment_positive_dominant(self):
        result = self.analyzer.analyze("great but slow")
        self.assertEqual(result, 2.0 - 1.0)
    
    def test_mixed_sentiment_negative_dominant(self):
        result = self.analyzer.analyze("terrible but nice")
        self.assertEqual(result, -3.0 + 1.0)
    
    def test_empty_string(self):
        result = self.analyzer.analyze("")
        self.assertEqual(result, 0.0)
    
    def test_whitespace_only(self):
        result = self.analyzer.analyze("   ")
        self.assertEqual(result, 0.0)
    
    def test_punctuation_handling(self):
        result = self.analyzer.analyze("great! excellent. amazing,")
        self.assertEqual(result, 5.0)
    
    def test_case_insensitivity(self):
        result1 = self.analyzer.analyze("GREAT")
        result2 = self.analyzer.analyze("Great")
        result3 = self.analyzer.analyze("great")
        self.assertEqual(result1, 2.0)
        self.assertEqual(result2, 2.0)
        self.assertEqual(result3, 2.0)
    
    def test_special_characters(self):
        result = self.analyzer.analyze("great!!! @#$ excellent???")
        self.assertEqual(result, 2.0 + 2.0)
    
    def test_score_clamping_upper_bound(self):
        result = self.analyzer.analyze("fantastic outstanding perfect")
        self.assertEqual(result, 5.0)
    
    def test_score_clamping_lower_bound(self):
        result = self.analyzer.analyze("terrible awful horrible")
        self.assertEqual(result, -5.0)
    
    def test_score_within_bounds(self):
        result = self.analyzer.analyze("good nice")
        self.assertEqual(result, 1.0 + 1.0)
        self.assertGreaterEqual(result, -5.0)
        self.assertLessEqual(result, 5.0)
    
    def test_realistic_positive_feedback(self):
        result = self.analyzer.analyze("The driver was great and very professional")
        self.assertEqual(result, 2.0 + 2.0)
    
    def test_realistic_negative_feedback(self):
        result = self.analyzer.analyze("The driver was rude and late")
        self.assertEqual(result, -2.0 - 1.0)
    
    def test_realistic_mixed_feedback(self):
        result = self.analyzer.analyze("The driver was nice but the car was dirty")
        self.assertEqual(result, 1.0 - 2.0)

if __name__ == '__main__':
    unittest.main()
