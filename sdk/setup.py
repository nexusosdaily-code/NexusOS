"""
WASCII v7 SDK Setup

Install with: pip install .
"""

from setuptools import setup, find_packages

setup(
    name="wascii_v7",
    version="7.1.0",
    author="NexusOS WNSP Developers",
    author_email="nexusos@example.com",
    description="W-ASCII v7 SDK for Wavelength-Native Signalling Protocol",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    url="https://github.com/nexusosdaily-code/WNSP-P2P-Hub",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: GNU General Public License v3 (GPLv3)",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Physics",
        "Topic :: Communications",
    ],
    python_requires=">=3.8",
    install_requires=[],
    extras_require={
        "dev": ["pytest", "black", "mypy"],
    },
    keywords="wnsp wavelength protocol encoding blockchain physics",
)
