import seaborn as sns
import matplotlib.pyplot as plt
import pandas as pd


def plot_actors_violin(
        df_filtered: pd.DataFrame,
        figsize: tuple = (16, 6)
) -> None:
    """
    Crea violin plot con titoli e commenti identici all'originale.

    Args:
        df_filtered: DataFrame contenente le colonne:
                    - 'actor_group' (gruppi di attori)
                    - 'rating' (valutazioni)
                    - 'minute' (durata in minuti)
        figsize: Dimensioni della figura (default: (16, 6))
    """
    # Impostiamo lo stile di Seaborn (commento originale)
    sns.set(style="whitegrid")

    # Creiamo una figura con due subplot (commento originale)
    fig, axes = plt.subplots(1, 2, figsize=figsize)

    # 1. Violin Plot: Rating vs Numero di Attori (commento originale)
    sns.violinplot(
        data=df_filtered,
        x='actor_group',
        y='rating',
        inner="quartile",  # Mostra i quartili all'interno del violin plot (commento originale)
        ax=axes[0]
    )
    axes[0].set_title("Distribuzione del Rating in Base al Numero di Attori")  # Titolo originale
    axes[0].set_xlabel("Numero di Attori")  # Etichetta originale
    axes[0].set_ylabel("Rating")  # Etichetta originale

    # 2. Violin Plot: Durata vs Numero di Attori (commento originale)
    sns.violinplot(
        data=df_filtered,
        x='actor_group',
        y='minute',
        inner="quartile",  # Mostra i quartili all'interno del violin plot (commento originale)
        ax=axes[1]
    )
    axes[1].set_title("Distribuzione della Durata in Base al Numero di Attori")  # Titolo originale
    axes[1].set_xlabel("Numero di Attori")  # Etichetta originale
    axes[1].set_ylabel("Durata (minuti)")  # Etichetta originale

    # Mostra il grafico (commento originale)
    plt.tight_layout()
    plt.show()