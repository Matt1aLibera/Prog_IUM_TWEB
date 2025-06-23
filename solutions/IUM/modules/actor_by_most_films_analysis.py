import matplotlib.pyplot as plt
import seaborn as sns
from typing import Tuple
import pandas as pd


def plot_actor_stats(
        actor_stats_filtered: pd.DataFrame,
        top_actors: list,
        global_avg_rating: float,
        actors_to_analyse: int,
        figsize: Tuple[int, int] = (12, 10)
) -> None:
    """
    Crea il grafico combinato di barre e lineplot per l'analisi degli attori.
    Mantiene TUTTI i commenti originali della versione inline.

    Args:
        actor_stats_filtered: DataFrame filtrato con i dati degli attori
        top_actors: Lista degli attori top da visualizzare
        global_avg_rating: Valore medio globale del rating
        actors_to_analyse: Numero di attori da visualizzare
        figsize: Dimensioni della figura (default: (12, 10))
    """
    # Crea il grafico
    fig, ax1 = plt.subplots(figsize=figsize)

    # Barplot orizzontale per il numero di film
    bars = sns.barplot(
        x='film_count',
        y='actor',
        data=actor_stats_filtered,
        color='skyblue',
        ax=ax1,
        label='Numero di Film'
    )

    # Imposta le etichette e il titolo
    ax1.set_xlabel('Numero di Film')
    ax1.set_ylabel('Attore')
    ax1.set_title(f'Attori con più film, nazione più frequente e rating medio (Top {actors_to_analyse})')

    # Aggiungi la nazione più frequente come annotazione SULLA BARRA
    for i, (bar, actor, country) in enumerate(zip(
            bars.patches,
            actor_stats_filtered['actor'],
            actor_stats_filtered['country']
    )):
        ax1.text(
            bar.get_width() / 2,
            bar.get_y() + bar.get_height() / 2,
            f'{country}',
            ha='center',
            va='center',
            fontsize=9,
            color='white',
            fontweight='bold'
        )

    # Aggiungi un nuovo asse verticale per il rating medio
    ax2 = ax1.twiny()

    # Sposta il linegraph del rating medio ulteriormente a destra
    rating_offset = max(actor_stats_filtered['film_count']) * 1.4
    ax2.plot(
        actor_stats_filtered.set_index('actor').loc[top_actors, 'avg_rating'] + rating_offset,
        range(len(top_actors)),
        color='red',
        marker='o',
        linestyle='-',
        linewidth=2,
        label='Rating Medio (per attore)'
    )

    # Aggiungi la scritta del rating medio per ogni attore sul linegraph
    for i, (actor, avg_rating) in enumerate(zip(
            top_actors,
            actor_stats_filtered.set_index('actor').loc[top_actors, 'avg_rating']
    )):
        ax2.text(
            avg_rating + rating_offset + 0.3,
            i,
            f'{avg_rating:.1f}',
            ha='left',
            va='center',
            fontsize=9,
            color='red'
        )

    # Imposta i limiti dell'asse x per il linegraph del rating
    ax2.set_xlim(-2 + rating_offset, 5 + rating_offset)
    ax2.set_xticks([])

    # Aggiungi una linea verticale per il rating medio globale
    ax2.axvline(
        global_avg_rating + rating_offset,
        color='green',
        linestyle='--',
        linewidth=2,
        label='Rating Medio Globale'
    )

    # Aggiungi un'annotazione per il rating medio globale
    ax2.text(
        global_avg_rating + rating_offset + 0.1,
        len(top_actors) + 1,
        f'Media Globale: {global_avg_rating:.1f}',
        ha='left',
        va='bottom',
        fontsize=10,
        color='green',
        fontweight='bold'
    )

    # Mostra la legenda
    ax1.legend(loc='upper left', bbox_to_anchor=(1.02, 1))
    ax2.legend(loc='upper left', bbox_to_anchor=(1.02, 0.9))

    plt.tight_layout()
    plt.show()