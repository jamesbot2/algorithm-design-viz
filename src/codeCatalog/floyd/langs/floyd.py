INF = float("inf")  # missing edge


def floyd(dist: list[list[float]]) -> list[list[float]]:
    """Floyd-Warshall — complete Python reference."""
    n = len(dist)
    d = [row[:] for row in dist]  # @a: init
    for k in range(n):  # @a: kLoop
        for i in range(n):
            for j in range(n):
                if d[i][k] + d[k][j] < d[i][j]:  # @a: relax
                    d[i][j] = d[i][k] + d[k][j]  # @a: update
    return d  # @a: done
