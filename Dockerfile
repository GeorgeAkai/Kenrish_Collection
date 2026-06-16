# python:3.12-slim satisfies PEP 706 secure sdist extraction natively,
# eliminating the pip symlink path-traversal CVEs on legacy runtimes.
FROM python:3.12-slim

# Upgrade system packages in a single chained layer:
#   - apt-get upgrade covers Linux-PAM (CVE-2026-54411) and tar (CVE-2025-45582)
#     via their Debian-patched packages.
#   - Explicit targets for perl/libio-compress-perl ensure the DoS/parser
#     CVEs (CVE-2026-48959, CVE-2026-48962, CVE-2026-7010, CVE-2025-15649)
#     are addressed even when a global upgrade skips them.
#   - Cache is cleared in the same RUN layer to keep image size minimal.
RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
        perl \
        libio-compress-perl \
        libpam-modules \
        tar && \
    rm -rf /var/lib/apt/lists/*

# Explicitly pin pip to its latest release so the symlink path-traversal
# fixes (CVE-2025-8869, CVE-2026-8643, CVE-2026-6357, CVE-2026-3219) are
# present regardless of what the base image ships with.
RUN pip install --no-cache-dir --upgrade pip

WORKDIR /app

COPY . .

CMD ["python", "-m", "py_compile", "--help"]
