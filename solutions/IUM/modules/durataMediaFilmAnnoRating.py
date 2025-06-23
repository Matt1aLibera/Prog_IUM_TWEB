import matplotlib.pyplot as plt
import pandas as pd


def prepare_rating_groups(df, bins):
    """Crea le colonne necessarie per il plot"""
    df = df.copy()
    df['rating_group'] = pd.cut(df['rating'], bins=bins, include_lowest=True)
    return df


def create_palette():
    """Restituisce la palette di colori predefinita"""
    return {
        pd.Interval(-0.001, 1.0, closed='right'): '#FFFFFF',
        pd.Interval(1.0, 2.0, closed='right'): '#8B0000',
        pd.Interval(2.0, 3.0, closed='right'): '#FFFF00',
        pd.Interval(3.0, 4.0, closed='right'): '#00CED1',
        pd.Interval(4.0, 5.0, closed='right'): '#008000'
    }


def plot_rating_duration(df_avg, df_avg_total, df_avg_rated, figsize=(12, 6)):
    """Genera il grafico completo"""
    plt.figure(figsize=figsize)
    palette = create_palette()

    # Linee per intervalli di rating
    for interval, color in palette.items():
        if interval in df_avg.columns:
            plt.plot(df_avg.index, df_avg[interval],
                     label=f'{interval.left}-{interval.right}',
                     color=color)

    # Linee di riferimento
    plt.plot(df_avg_total.index, df_avg_total,
             label='Durata media totale',
             color='black', linestyle='--', linewidth=2)

    plt.plot(df_avg_rated.index, df_avg_rated,
             label='Durata media (film con rating)',
             color='blue', linestyle=':', linewidth=2)

    # Formattazione
    handles, labels = plt.gca().get_legend_handles_labels()
    plt.legend(handles[::-1], labels[::-1],
               title='Rating',
               bbox_to_anchor=(1.05, 1),
               loc='upper left')

    plt.xlabel('Anno di rilascio')
    plt.ylabel('Durata media (minuti)')
    plt.title('Durata media dei film per Anno e Rating')
    plt.show()