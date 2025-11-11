
from abc import ABC, abstractmethod
from typing import Dict, Optional
from difflib import SequenceMatcher

class ISentimentAnalyzer(ABC):
    
    @abstractmethod
    def analyze(self, text: str) -> float:
        pass

class RuleBasedSentimentAnalyzer(ISentimentAnalyzer):
    
    def __init__(self):
        self.keyword_scores: Dict[str, float] = {
            "terrible": -3, "awful": -3, "horrible": -3, "worst": -3, "disgusting": -3,
            "appalling": -3, "atrocious": -3, "dreadful": -3, "abysmal": -3, "pathetic": -3,
            "useless": -3, "nightmare": -3, "disaster": -3, "catastrophe": -3,
            
            "bad": -2, "poor": -2, "disappointing": -2, "rude": -2, "unprofessional": -2,
            "dirty": -2, "unacceptable": -2, "inadequate": -2, "inferior": -2, "subpar": -2,
            "unsatisfactory": -2, "unpleasant": -2, "annoying": -2, "frustrating": -2,
            "careless": -2, "sloppy": -2, "messy": -2, "smelly": -2, "broken": -2,
            "damaged": -2, "unsafe": -2, "dangerous": -2, "scary": -2, "worried": -2,
            
            "late": -1, "slow": -1, "uncomfortable": -1, "mediocre": -1, "lacking": -1,
            "substandard": -1, "below": -1, "minor": -1, "issue": -1, "problem": -1,
            "concern": -1, "delay": -1, "wait": -1, "waiting": -1, "cold": -1,
            "noisy": -1, "loud": -1, "cramped": -1, "tight": -1, "old": -1,
            "worn": -1, "tired": -1, "confused": -1, "lost": -1, "wrong": -1,
            
            "okay": 0, "fine": 0, "average": 0, "normal": 0, "standard": 0,
            "regular": 0, "typical": 0, "usual": 0, "acceptable": 0, "adequate": 0,
            "decent": 0, "fair": 0, "moderate": 0, "reasonable": 0, "satisfactory": 0,
            "alright": 0, "ok": 0, "so-so": 0, "nothing": 0, "basic": 0,
            
            "good": 1, "nice": 1, "helpful": 1, "friendly": 1, "clean": 1,
            "pleasant": 1, "polite": 1, "courteous": 1, "kind": 1, "gentle": 1,
            "patient": 1, "understanding": 1, "accommodating": 1, "cooperative": 1,
            "reliable": 1, "punctual": 1, "timely": 1, "efficient": 1, "smooth": 1,
            "easy": 1, "simple": 1, "convenient": 1, "comfortable": 1, "safe": 1,
            
            "great": 2, "excellent": 2, "amazing": 2, "professional": 2, "superb": 2,
            "impressive": 2, "wonderful": 2, "fantastic": 2, "brilliant": 2, "awesome": 2,
            "terrific": 2, "fabulous": 2, "marvelous": 2, "splendid": 2, "delightful": 2,
            "enjoyable": 2, "pleasant": 2, "satisfying": 2, "quality": 2, "top": 2,
            "best": 2, "superior": 2, "premium": 2, "first-class": 2, "high-quality": 2,
            
            "outstanding": 3, "perfect": 3, "exceptional": 3, "extraordinary": 3,
            "phenomenal": 3, "magnificent": 3, "spectacular": 3, "incredible": 3,
            "unbelievable": 3, "remarkable": 3, "exemplary": 3, "flawless": 3,
            "impeccable": 3, "pristine": 3, "supreme": 3, "ultimate": 3,
        }
        
        self.negation_words = {
            "not", "no", "never", "neither", "nobody", "nothing", "nowhere",
            "hardly", "barely", "scarcely", "rarely", "seldom", "without",
            "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot"
        }
        
        self.intensifiers = {
            "very": 1.5, "extremely": 2.0, "incredibly": 2.0, "absolutely": 1.8,
            "really": 1.3, "quite": 1.2, "pretty": 1.1, "fairly": 1.1,
            "totally": 1.8, "completely": 1.8, "utterly": 2.0, "highly": 1.5
        }
        
        self.diminishers = {
            "slightly": 0.5, "somewhat": 0.6, "barely": 0.4, "hardly": 0.3,
            "a bit": 0.6, "a little": 0.6, "kind of": 0.7, "sort of": 0.7
        }
        
        self.fuzzy_match_enabled = True
        self.fuzzy_match_threshold = 0.85
        self._fuzzy_cache = {}
    
    def _fuzzy_match_keyword(self, word: str) -> Optional[str]:
        if not self.fuzzy_match_enabled:
            return None
        
        if word in self._fuzzy_cache:
            return self._fuzzy_cache[word]
        
        if len(word) < 3:
            return None
        
        best_match = None
        best_ratio = 0.0
        
        for keyword in self.keyword_scores.keys():
            if abs(len(word) - len(keyword)) > 2:
                continue
            
            ratio = SequenceMatcher(None, word, keyword).ratio()
            
            if ratio > best_ratio and ratio >= self.fuzzy_match_threshold:
                best_ratio = ratio
                best_match = keyword
        
        self._fuzzy_cache[word] = best_match
        
        return best_match
    
    def analyze(self, text: str) -> float:
        tokens = self._tokenize(text)
        
        total_score = self._match_keywords(tokens)
        
        normalized_score = self._enhanced_neutral_detection(total_score, tokens)
        
        return normalized_score
    
    def _tokenize(self, text: str) -> list[str]:
        text_lower = text.lower()
        
        words = []
        for word in text_lower.split():
            cleaned_word = word.strip('.,!?;:()[]{}"\'-')
            if cleaned_word:
                words.append(cleaned_word)
        
        return words
    
    def _match_keywords(self, tokens: list[str]) -> float:
        total_score = 0.0
        i = 0
        
        while i < len(tokens):
            token = tokens[i]
            
            intensity = 1.0
            if token in self.intensifiers:
                intensity = self.intensifiers[token]
                i += 1
                if i >= len(tokens):
                    break
                token = tokens[i]
            elif token in self.diminishers:
                intensity = self.diminishers[token]
                i += 1
                if i >= len(tokens):
                    break
                token = tokens[i]
            
            is_negated = False
            if i > 0 and tokens[i-1] in self.negation_words:
                is_negated = True
            elif i > 1 and tokens[i-2] in self.negation_words:
                is_negated = True
            
            matched_keyword = None
            
            if token in self.keyword_scores:
                matched_keyword = token
            elif self.fuzzy_match_enabled:
                matched_keyword = self._fuzzy_match_keyword(token)
            
            if matched_keyword:
                score = self.keyword_scores[matched_keyword] * intensity
                if is_negated:
                    score = -score * 0.8
                total_score += score
            
            i += 1
        
        return total_score
    
    def _enhanced_neutral_detection(self, score: float, tokens: list[str]) -> float:
        neutral_indicators = {
            'was', 'were', 'is', 'are', 'had', 'have', 'got', 'went', 'came',
            'arrived', 'left', 'took', 'picked', 'dropped', 'drove', 'ride',
            'trip', 'journey', 'time', 'minutes', 'hours', 'destination',
            'location', 'address', 'street', 'road', 'traffic', 'weather'
        }
        
        neutral_count = sum(1 for token in tokens if token in neutral_indicators)
        
        text_length = len(tokens)
        neutral_ratio = neutral_count / max(text_length, 1)
        
        if neutral_ratio > 0.4:
            return 0.0
        
        if text_length <= 3:
            neutral_threshold = 0.3
        elif text_length <= 10:
            neutral_threshold = 0.5
        else:
            neutral_threshold = 0.7
        
        if abs(score) <= neutral_threshold:
            return 0.0
        
        return self._normalize_score_enhanced(score)
    
    def _normalize_score_enhanced(self, score: float) -> float:
        if score < -5:
            score = -5.0
        elif score > 5:
            score = 5.0
        
        if -0.5 <= score <= 0.5:
            return 0.0
        elif score < -0.5:
            return max(-5.0, score)
        else:
            return min(5.0, score)
    
    def get_sentiment_category(self, score: float) -> str:
        if score < -0.5:
            return 'negative'
        elif score > 0.5:
            return 'positive'
        else:
            return 'neutral'
    
    def get_fuzzy_match_stats(self) -> dict:
        return {
            "enabled": self.fuzzy_match_enabled,
            "threshold": self.fuzzy_match_threshold,
            "cache_size": len(self._fuzzy_cache),
            "cached_matches": {k: v for k, v in self._fuzzy_cache.items() if v is not None}
        }
    
    def clear_fuzzy_cache(self):
        self._fuzzy_cache.clear()
    
    def set_fuzzy_threshold(self, threshold: float):
        if 0.0 <= threshold <= 1.0:
            self.fuzzy_match_threshold = threshold
            self.clear_fuzzy_cache()