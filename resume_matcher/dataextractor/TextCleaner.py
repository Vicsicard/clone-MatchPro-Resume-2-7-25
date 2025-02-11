import re
import sys
import spacy

# Load the English model
print("Loading spaCy model...", file=sys.stderr, flush=True)
nlp = spacy.load("en_core_web_md")
print("spaCy model loaded successfully", file=sys.stderr, flush=True)

RESUME_SECTIONS = [
    "Contact Information",
    "Objective",
    "Summary",
    "Education",
    "Experience",
    "Skills",
    "Projects",
    "Certifications",
    "Licenses",
    "Awards",
    "Honors",
    "Publications",
    "References",
    "Technical Skills",
    "Computer Skills",
    "Programming Languages",
    "Software Skills",
    "Soft Skills",
    "Language Skills",
    "Professional Skills",
    "Transferable Skills",
    "Work Experience",
    "Professional Experience",
    "Employment History",
    "Internship Experience",
    "Volunteer Experience",
    "Leadership Experience",
    "Research Experience",
    "Teaching Experience",
]

REGEX_PATTERNS = {
    "email_pattern": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    "phone_pattern": r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
    "link_pattern": r"\b(?:https?://|www\.)\S+\b",
}

READ_RESUME_FROM = "Data/Resumes/"
SAVE_DIRECTORY_RESUME = "Data/Processed/Resumes"

READ_JOB_DESCRIPTION_FROM = "Data/JobDescription/"
SAVE_DIRECTORY_JOB_DESCRIPTION = "Data/Processed/JobDescription"


class TextCleaner:
    """
    A class for cleaning a text by removing specific patterns.
    """

    @staticmethod
    def remove_emails_links(text):
        """
        Clean the input text by removing specific patterns.

        Args:
            text (str): The input text to clean.

        Returns:
            str: The cleaned text.
        """
        try:
            print("Removing emails and links...", file=sys.stderr, flush=True)
            # Remove email addresses
            text = re.sub(REGEX_PATTERNS["email_pattern"], "", text)
            # Remove links
            text = re.sub(REGEX_PATTERNS["link_pattern"], "", text)
            print("Successfully removed emails and links", file=sys.stderr, flush=True)
            return text
        except Exception as e:
            print(f"Error removing emails and links: {str(e)}", file=sys.stderr, flush=True)
            raise

    @staticmethod
    def clean_text(text):
        """
        Clean the input text by removing specific patterns.

        Args:
            text (str): The input text to clean.

        Returns:
            str: The cleaned text.
        """
        try:
            print("Starting text cleaning...", file=sys.stderr, flush=True)
            print(f"Input text length: {len(text)}", file=sys.stderr, flush=True)
            
            # Remove emails and links
            text = TextCleaner.remove_emails_links(text)

            # Remove special characters and digits
            text = re.sub(r"[^a-zA-Z\s]", "", text)
            print("Removed special characters and digits", file=sys.stderr, flush=True)

            # Convert to lowercase
            text = text.lower()
            print("Converted to lowercase", file=sys.stderr, flush=True)

            # Remove extra whitespace
            text = " ".join(text.split())
            print("Removed extra whitespace", file=sys.stderr, flush=True)

            print(f"Final cleaned text length: {len(text)}", file=sys.stderr, flush=True)
            return text
        except Exception as e:
            print(f"Error cleaning text: {str(e)}", file=sys.stderr, flush=True)
            raise

    @staticmethod
    def remove_stopwords(text):
        """
        Clean the input text by removing stopwords.

        Args:
            text (str): The input text to clean.

        Returns:
            str: The cleaned text.
        """
        try:
            print("Removing stopwords...", file=sys.stderr, flush=True)
            doc = nlp(text)
            tokens = [token.text for token in doc if not token.is_stop]
            cleaned_text = " ".join(tokens)
            print("Successfully removed stopwords", file=sys.stderr, flush=True)
            return cleaned_text
        except Exception as e:
            print(f"Error removing stopwords: {str(e)}", file=sys.stderr, flush=True)
            raise


class CountFrequency:
    def __init__(self, text):
        self.text = text
        self.doc = nlp(text)

    def count_frequency(self):
        """
        Count the frequency of words in the input text.

        Returns:
            dict: A dictionary with the words as keys and the frequency as values.
        """
        pos_freq = {}
        for token in self.doc:
            if token.pos_ in pos_freq:
                pos_freq[token.pos_] += 1
            else:
                pos_freq[token.pos_] = 1
        return pos_freq
