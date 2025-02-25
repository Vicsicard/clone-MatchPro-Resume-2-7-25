from setuptools import setup, find_packages

setup(
    name="resume_matcher",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "cohere",
        "spacy",
        "python-dotenv",
        "pdfminer.six",
        "nltk",
        "textacy",
        "qdrant-client",
        "pypdf",
    ],
)
