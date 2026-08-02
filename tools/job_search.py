from providers.provider_manager import search_all_jobs


def search_jobs(query: str, location: str):

    return search_all_jobs(
        query=query,
        location=location
    )