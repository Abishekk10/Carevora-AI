from providers.provider_manager import search_all_jobs


def search_jobs(
    query: str, location: str, page: int = 1, results_per_page: int = 20
):

    return search_all_jobs(
        query=query,
        location=location,
        page=page,
        results_per_page=results_per_page,
    )
